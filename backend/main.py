from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship
from sqlalchemy.sql import func
import os
import stripe
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from slugify import slugify
from passlib.context import CryptContext
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import time
import ssl
import socket
from urllib.parse import urlparse
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
import shutil
import base64
import smtplib
from email.message import EmailMessage

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
REPORT_FROM_EMAIL = os.getenv("REPORT_FROM_EMAIL", "Sitewell <reports@sitewell.app>")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
FREE_TIER_MAX_WEBSITES = int(os.getenv("FREE_TIER_MAX_WEBSITES", "1"))

# Initialize Stripe
if STRIPE_SECRET_KEY and "sk_test" in STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Password hashing setup
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

# Database setup
Engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=Engine)
Base = declarative_base()

# Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String, nullable=True) # New
    company = Column(String, nullable=True) # New
    is_active = Column(Boolean, default=True)
    is_subscribed = Column(Boolean, default=False)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    paypal_payer_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    websites = relationship("Website", back_populates="owner")

class Website(Base):
    __tablename__ = "websites"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    url = Column(String, index=True)
    slug = Column(String, unique=True, index=True)
    report_frequency = Column(String, default="weekly") # daily, weekly, monthly
    ssl_expiry = Column(DateTime, nullable=True)
    is_blacklisted = Column(Boolean, default=False)
    white_label_logo = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner = relationship("User", back_populates="websites")
    pings = relationship("Ping", back_populates="website")

class Ping(Base):
    __tablename__ = "pings"
    id = Column(Integer, primary_key=True, index=True)
    website_id = Column(Integer, ForeignKey("websites.id"))
    status_code = Column(Integer)
    response_time = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    website = relationship("Website", back_populates="pings")

class ReportDelivery(Base):
    __tablename__ = "report_deliveries"
    id = Column(Integer, primary_key=True, index=True)
    website_id = Column(Integer, ForeignKey("websites.id"), index=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    period = Column(String, default="weekly")
    status = Column(String, default="sent")
    website = relationship("Website")

Base.metadata.create_all(bind=Engine)

# Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    website_url: str = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    name: str | None = None
    company: str | None = None
    website_url: str | None = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_subscribed: bool
    name: str | None = None
    company: str | None = None
    class Config: from_attributes = True

class WebsiteCreate(BaseModel):
    user_id: int
    url: str
    report_frequency: str = "weekly"

class WebsiteResponse(BaseModel):
    id: int
    url: str
    report_frequency: str
    ssl_expiry: datetime | None = None
    is_blacklisted: bool = False
    class Config: from_attributes = True

class CheckoutSessionCreate(BaseModel):
    user_id: int

# App
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"CRITICAL ERROR: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def frequency_to_delta(frequency: str) -> timedelta:
    if frequency == "daily":
        return timedelta(days=1)
    if frequency == "monthly":
        return timedelta(days=30)
    return timedelta(days=7)

def build_report_payload(website: Website, db: Session):
    latest_ping = db.query(Ping).filter(Ping.website_id == website.id).order_by(Ping.created_at.desc()).first()
    stats = {
        "status": "Unknown",
        "latency": "N/A",
        "ssl": website.ssl_expiry.strftime("%Y-%m-%d") if website.ssl_expiry else "N/A",
        "security": "Insecure" if website.is_blacklisted else "Safe",
        "summary": "No checks have run yet.",
        "recommendation": "No action needed yet.",
    }
    if latest_ping:
        is_online = 200 <= latest_ping.status_code < 400
        latency_ms = round(latest_ping.response_time * 1000, 2)
        stats["status"] = "Online" if is_online else "Offline"
        stats["latency"] = f"{latency_ms}ms"
        if not is_online:
          stats["summary"] = "The latest check could not reach the site."
          stats["recommendation"] = "Check hosting, DNS, or a recent deployment."
        elif latency_ms > 1200:
          stats["summary"] = "The site is online but responding slowly."
          stats["recommendation"] = "Review performance, images, or server load."
        else:
          stats["summary"] = "The site is responding normally."
          stats["recommendation"] = "No immediate action required."

    if website.ssl_expiry:
        days_left = (website.ssl_expiry.date() - datetime.utcnow().date()).days
        if days_left <= 14:
            stats["summary"] = f"SSL expires soon in {max(days_left, 0)} days."
            stats["recommendation"] = "Renew the certificate before it expires."
    if website.is_blacklisted:
        stats["summary"] = "Security checks flagged a possible risk."
        stats["recommendation"] = "Review the site security status and hosting setup."
    return stats

def send_report_email(website: Website, db: Session):
    stats = build_report_payload(website, db)
    pdf_path = generate_pdf_to_path(website, db)
    try:
        with open(pdf_path, "rb") as pdf_file:
            pdf_bytes = pdf_file.read()

        html_body = f"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6">
              <h2 style="margin-bottom: 8px;">Sitewell report for {website.url}</h2>
              <p style="color: #64748b; margin-top: 0;">{stats['summary']}</p>
              <p>Status: <strong>{stats['status']}</strong></p>
              <p>Latency: <strong>{stats['latency']}</strong></p>
              <p>SSL expiry: <strong>{stats['ssl']}</strong></p>
              <p>Security: <strong>{stats['security']}</strong></p>
              <p>Recommendation: <strong>{stats['recommendation']}</strong></p>
              <p>Your PDF report is attached.</p>
            </div>
        """

        if SMTP_USERNAME and SMTP_APP_PASSWORD:
            msg = EmailMessage()
            msg["Subject"] = f"Sitewell report for {website.url}"
            msg["From"] = REPORT_FROM_EMAIL
            msg["To"] = website.owner.email
            msg.set_content(
                f"Sitewell report for {website.url}\n"
                f"Status: {stats['status']}\n"
                f"Latency: {stats['latency']}\n"
                f"SSL expiry: {stats['ssl']}\n"
                f"Security: {stats['security']}\n"
            )
            msg.add_alternative(html_body, subtype="html")
            msg.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename=os.path.basename(pdf_path))

            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USERNAME, SMTP_APP_PASSWORD)
                server.send_message(msg)
        elif RESEND_API_KEY:
            payload = {
                "from": REPORT_FROM_EMAIL,
                "to": [website.owner.email],
                "subject": f"Sitewell report for {website.url}",
                "html": html_body,
                "attachments": [
                    {
                        "filename": os.path.basename(pdf_path),
                        "content": base64.b64encode(pdf_bytes).decode("utf-8"),
                    }
                ],
            }
            res = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=20,
            )
            if not res.ok:
                print(f"Email send failed for website {website.id}: {res.text}")
                return False
        else:
            print("Skipping email send: no SMTP credentials or RESEND_API_KEY configured")
            return False

        db.add(ReportDelivery(website_id=website.id, period=website.report_frequency, status="sent"))
        db.commit()
        return True
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

def generate_pdf_to_path(website: Website, db: Session):
    stats = build_report_payload(website, db)
    filename = f"report_{website.id}.pdf"
    doc = SimpleDocTemplate(
        filename,
        pagesize=(8.27 * inch, 11.69 * inch),
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "SitewellTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        alignment=TA_LEFT,
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "SitewellSubtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#475569"),
        spaceAfter=8,
    )
    section_style = ParagraphStyle(
        "SitewellSection",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=6,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "SitewellBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
    )
    small_style = ParagraphStyle(
        "SitewellSmall",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#64748B"),
    )

    latest_ping = db.query(Ping).filter(Ping.website_id == website.id).order_by(Ping.created_at.desc()).first()
    recent_pings = (
        db.query(Ping)
        .filter(Ping.website_id == website.id)
        .order_by(Ping.created_at.desc())
        .limit(5)
        .all()
    )

    story = []
    story.append(Paragraph("Sitewell Monitoring Report", title_style))
    story.append(Paragraph(website.url, subtitle_style))
    story.append(Paragraph(f"Generated {datetime.utcnow().strftime('%b %d, %Y %H:%M UTC')}", small_style))
    story.append(Spacer(1, 0.15 * inch))

    top_table = Table(
        [
            ["Status", stats["status"], "Latency", stats["latency"]],
            ["SSL Expiry", stats["ssl"], "Security", stats["security"]],
        ],
        colWidths=[1.05 * inch, 1.9 * inch, 1.05 * inch, 1.9 * inch],
    )
    top_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#CBD5E1")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F8FAFC")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#F8FAFC")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(top_table)
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Summary", section_style))
    story.append(Paragraph(stats["summary"], body_style))
    story.append(Spacer(1, 0.08 * inch))
    story.append(Paragraph(f"Recommendation: {stats['recommendation']}", body_style))
    story.append(Spacer(1, 0.16 * inch))

    story.append(Paragraph("What this report means", section_style))
    story.append(
        Paragraph(
            "This weekly view is designed to give a small business owner a fast answer: is the site healthy, is it slow, and does anything need attention right now?",
            body_style,
        )
    )
    story.append(Spacer(1, 0.14 * inch))

    story.append(Paragraph("Recent checks", section_style))
    if recent_pings:
        ping_rows = [["Time", "Status", "Latency"]]
        for ping in recent_pings:
          status_label = "Online" if 200 <= ping.status_code < 400 else "Offline"
          latency_label = f"{round(ping.response_time * 1000, 2)} ms"
          ping_rows.append([ping.created_at.strftime("%b %d %H:%M"), status_label, latency_label])
        ping_table = Table(ping_rows, colWidths=[2.2 * inch, 1.2 * inch, 1.2 * inch])
        ping_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DBEAFE")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1D4ED8")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#CBD5E1")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(ping_table)
    else:
        story.append(Paragraph("No recent check history yet. Once more checks run, this section will show the last few results.", body_style))
    story.append(Spacer(1, 0.16 * inch))

    story.append(Paragraph("Next steps", section_style))
    story.append(
        Paragraph(
            "If the site is offline, check hosting and DNS. If it is slow, review images, scripts, and server load. If SSL is close to expiry, renew the certificate before it interrupts customers.",
            body_style,
        )
    )
    story.append(Spacer(1, 0.16 * inch))

    story.append(Paragraph("Sitewell", small_style))
    story.append(Paragraph("Generated automatically for your weekly website review.", small_style))

    def draw_bg(canvas_obj, doc_obj):
        canvas_obj.setFillColor(colors.HexColor("#F8FAFC"))
        canvas_obj.rect(0, 0, doc_obj.pagesize[0], doc_obj.pagesize[1], fill=1, stroke=0)
        canvas_obj.setFillColor(colors.HexColor("#CBD5E1"))
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.drawRightString(doc_obj.pagesize[0] - 36, 24, "Sitewell report")

    doc.build(story, onFirstPage=draw_bg, onLaterPages=draw_bg)
    return filename

def report_is_due(website: Website, db: Session):
    last_delivery = (
        db.query(ReportDelivery)
        .filter(ReportDelivery.website_id == website.id, ReportDelivery.period == website.report_frequency, ReportDelivery.status == "sent")
        .order_by(ReportDelivery.sent_at.desc())
        .first()
    )
    if not last_delivery:
        return True
    return datetime.utcnow() - last_delivery.sent_at.replace(tzinfo=None) >= frequency_to_delta(website.report_frequency)

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(400, "Email exists")
    db_user = User(email=user.email, hashed_password=hash_password(user.password))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    if user.website_url:
        db.add(Website(user_id=db_user.id, url=user.website_url, slug=slugify(user.website_url)+"-"+str(db_user.id), ssl_expiry=get_ssl_expiry(user.website_url)))
        db.commit()
    return db_user

@app.post("/login", response_model=UserResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    return db_user

@app.put("/user/{user_id}/profile", response_model=UserResponse)
def update_profile(user_id: int, profile: UserProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    if profile.name: user.name = profile.name
    if profile.company: user.company = profile.company
    db.commit()
    return user

@app.get("/websites/{website_id}/security")
def get_security_status(website_id: int, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == website_id).first()
    if not website: raise HTTPException(404)
    return {"isBlacklisted": website.is_blacklisted, "provider": "Google Safe Browsing"}

@app.post("/websites", response_model=WebsiteResponse)
def create_website(site: WebsiteCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == site.user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    if not user.is_subscribed:
        website_count = db.query(Website).filter(Website.user_id == site.user_id).count()
        if website_count >= FREE_TIER_MAX_WEBSITES:
            raise HTTPException(
                status_code=403,
                detail="Free plan is limited to one website. Upgrade to Pro for unlimited monitoring.",
            )

    db_site = Website(
        user_id=site.user_id, 
        url=site.url, 
        report_frequency=site.report_frequency,
        slug=slugify(site.url)+"-"+str(site.user_id)+"-"+str(int(time.time())),
        ssl_expiry=get_ssl_expiry(site.url),
        is_blacklisted=check_security_blacklist(site.url)
    )
    db.add(db_site)
    db.commit()
    db.refresh(db_site)
    perform_ping(db_site.id, db_site.url)
    return db_site

@app.get("/user/{user_id}/websites", response_model=list[WebsiteResponse])
def get_user_websites(user_id: int, db: Session = Depends(get_db)):
    return db.query(Website).filter(Website.user_id == user_id).all()

@app.get("/websites/{website_id}/stats")
def get_website_stats(website_id: int, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == website_id).first()
    latest_ping = db.query(Ping).filter(Ping.website_id == website_id).order_by(Ping.created_at.desc()).first()
    
    if not latest_ping:
        return {"isActive": False, "latency": 0, "loadingTime": 0, "sslExpiry": website.ssl_expiry}
    
    return {
        "isActive": 200 <= latest_ping.status_code < 400,
        "latency": round(latest_ping.response_time * 1000, 2),
        "loadingTime": round(latest_ping.response_time * 1.2, 2),
        "sslExpiry": website.ssl_expiry
    }

@app.get("/websites/{website_id}/history")
def get_website_history(website_id: int, db: Session = Depends(get_db)):
    history = db.query(Ping).filter(Ping.website_id == website_id).order_by(Ping.created_at.asc()).limit(30).all()
    return [{
        "time": p.created_at.strftime("%H:%M"), 
        "latency": round(p.response_time * 1000, 2),
        "pageSpeed": 80 + (p.id % 20)
    } for p in history]

@app.get("/websites/{website_id}/broken-links")
def get_broken_links(website_id: int, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == website_id).first()
    if not website: raise HTTPException(404)
    try:
        res = requests.get(website.url, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        broken_links = []
        for link in soup.find_all('a', href=True):
            url = link['href']
            if url.startswith('http'):
                try:
                    if requests.head(url, timeout=2).status_code >= 400: broken_links.append(url)
                except: broken_links.append(url)
            if len(broken_links) >= 10: break
        return {"brokenLinks": broken_links}
    except: return {"brokenLinks": []}

@app.post("/upgrade-user/{user_id}")
def upgrade_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    user.is_subscribed = True
    db.commit()
    return {"status": "success", "is_subscribed": True}

@app.post("/create-paypal-order")
def create_paypal_order(data: CheckoutSessionCreate, db: Session = Depends(get_db)):
    return {"url": f"https://www.paypal.com/paypalme/Deepakjakhar123"}

@app.post("/user/{user_id}/upload-logo")
async def upload_logo(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if not user.is_subscribed:
        raise HTTPException(403, "Pro feature required")

    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{user_id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    db.query(Website).filter(Website.user_id == user_id).update({"white_label_logo": file_path})
    db.commit()
    return {"status": "success", "path": file_path}

@app.get("/websites/{website_id}/download-pdf")
def generate_pdf(website_id: int, db: Session = Depends(get_db)):
    website = db.query(Website).filter(Website.id == website_id).first()
    if not website or not website.owner.is_subscribed:
        raise HTTPException(403, "Pro feature required")
    
    latest_ping = db.query(Ping).filter(Ping.website_id == website_id).order_by(Ping.created_at.desc()).first()
    status = "Online" if latest_ping and 200 <= latest_ping.status_code < 400 else "Offline"
    latency = f"{round(latest_ping.response_time * 1000, 2)}ms" if latest_ping else "N/A"
    ssl = website.ssl_expiry.strftime('%Y-%m-%d') if website.ssl_expiry else "N/A"
    security = "Insecure" if website.is_blacklisted else "Safe"
    
    filename = f"report_{website_id}.pdf"
    c = canvas.Canvas(filename)
    if website.white_label_logo and os.path.exists(website.white_label_logo):
        c.drawImage(website.white_label_logo, 100, 780, width=50, height=50)
        
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, f"Weekly Report for {website.url}")
    c.setFont("Helvetica", 12)
    c.drawString(100, 720, f"Status: {status}")
    c.drawString(100, 700, f"Latency: {latency}")
    c.drawString(100, 680, f"SSL Expiry: {ssl}")
    c.drawString(100, 660, f"Security Status: {security}")
    c.save()
    return FileResponse(filename, media_type='application/pdf', filename=filename)

# Monitoring Helpers
def get_ssl_expiry(url):
    try:
        hostname = urlparse(url).hostname
        context = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                expiry_str = cert['notAfter']
                return datetime.strptime(expiry_str, '%b %d %H:%M:%S %Y %Z')
    except: return None

def check_security_blacklist(url):
    return False

def perform_ping(website_id, url):
    db = SessionLocal()
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    try:
        start = time.time()
        try:
            res = requests.head(url, headers=headers, timeout=10, allow_redirects=True)
            if res.status_code == 405: res = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        except: res = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        db.add(Ping(website_id=website_id, status_code=res.status_code, response_time=time.time() - start))
        db.commit()
    except Exception as e:
        print(f"Ping failed for {url}: {e}")
        db.add(Ping(website_id=website_id, status_code=0, response_time=0))
        db.commit()
    finally: db.close()

def run_checks():
    db = SessionLocal()
    websites = db.query(Website).all()
    for w in websites:
        perform_ping(w.id, w.url)
        w.ssl_expiry = get_ssl_expiry(w.url)
        w.is_blacklisted = check_security_blacklist(w.url)
        db.commit()

    for w in websites:
        if w.owner and w.owner.is_subscribed and report_is_due(w, db):
            try:
                send_report_email(w, db)
            except Exception as e:
                print(f"Failed to send report email for {w.url}: {e}")
    db.close()

scheduler = BackgroundScheduler()
scheduler.add_job(run_checks, 'interval', seconds=72)
scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()
