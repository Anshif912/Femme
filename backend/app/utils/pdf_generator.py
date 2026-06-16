import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from typing import Dict, List

class NumberedCanvas(canvas.Canvas):
    """
    Custom canvas to support two-pass page numbering (Page X of Y)
    and custom headers/footers.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#718096"))
        
        # Draw Header
        self.drawString(54, 750, "FEMME Security Platform - Official Journey Incident Record")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        
        # Draw Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 40, page_text)
        self.drawString(54, 40, "Confidential document generated automatically by FEMME Incident Shield.")
        self.line(54, 52, 558, 52)
        
        self.restoreState()

def generate_fir_pdf(journey: Dict, capsules: List[Dict], contacts: List[Dict], output_path: str):
    # Setup document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )

    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#9B2C2C") # Dark Red
    )
    
    h1_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1A202C"),
        spaceBefore=15,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#2D3748")
    )
    
    bold_label_style = ParagraphStyle(
        'BoldLabel',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    code_style = ParagraphStyle(
        'CodeStyleCustom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#4A5568")
    )

    story = []

    # Title
    story.append(Spacer(1, 10))
    story.append(Paragraph("FEMME INCIDENT REPORT (FIR ASSIST)", title_style))
    story.append(Spacer(1, 6))
    
    gen_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    story.append(Paragraph(f"Generated on: <b>{gen_time}</b>", body_style))
    story.append(Spacer(1, 15))

    # Journey Capsule Metadata
    story.append(Paragraph("Journey Details", h1_style))
    
    # We display metadata in a table
    metadata = [
        [Paragraph("Cab Number / Plate:", bold_label_style), Paragraph(journey.get("cab_number", "N/A"), body_style),
         Paragraph("Service Provider:", bold_label_style), Paragraph(journey.get("provider", "N/A").capitalize(), body_style)],
        [Paragraph("Status:", bold_label_style), Paragraph(journey.get("status", "N/A").upper(), body_style),
         Paragraph("Start Time (UTC):", bold_label_style), Paragraph(str(journey.get("start_time", "N/A"))[:19], body_style)],
        [Paragraph("Pickup Location:", bold_label_style), Paragraph(journey.get("pickup_address", "N/A"), body_style),
         Paragraph("Destination Location:", bold_label_style), Paragraph(journey.get("dest_address", "N/A"), body_style)],
    ]
    
    meta_table = Table(metadata, colWidths=[1.2*inch, 2.3*inch, 1.2*inch, 2.3*inch])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F7FAFC")),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor("#F7FAFC")),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # Notified Emergency Guardians Table
    story.append(Paragraph("Notified Emergency Guardians", h1_style))
    contacts_data = [[
        Paragraph("Name", bold_label_style),
        Paragraph("Phone Number", bold_label_style),
        Paragraph("Alert Priority", bold_label_style)
    ]]
    for c in contacts:
        contacts_data.append([
            Paragraph(c.get("name", "N/A"), body_style),
            Paragraph(c.get("phone", "N/A"), body_style),
            Paragraph(f"Priority P{c.get('priority', 1)}", body_style)
        ])
    if len(contacts) == 0:
        contacts_data.append([
            Paragraph("N/A", body_style),
            Paragraph("No trusted contacts configured. Automatic secondary dispatch systems active.", body_style),
            Paragraph("N/A", body_style)
        ])
    contacts_table = Table(contacts_data, colWidths=[2.5*inch, 2.5*inch, 2.0*inch])
    contacts_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F7FAFC")),
    ]))
    story.append(contacts_table)
    story.append(Spacer(1, 15))

    # Safety Incident / Anomalies Log
    story.append(Paragraph("Detected Journey Anomalies & Alerts", h1_style))
    
    anomalies_rows = []
    # Identify anomalies from capsules
    deviation_count = sum(1 for c in capsules if c.get("route_deviation"))
    stop_count = sum(1 for c in capsules if c.get("motion_anomaly"))
    audio_count = sum(1 for c in capsules if c.get("audio_anomaly"))
    
    anomalies_summary = f"Route Deviations: {deviation_count} | Unusual Stops: {stop_count} | Audio Distress Incidents: {audio_count}"
    story.append(Paragraph(f"<b>Summary:</b> {anomalies_summary}", body_style))
    story.append(Spacer(1, 8))

    # Anomaly details
    anomaly_table_data = [[
        Paragraph("Timestamp", bold_label_style),
        Paragraph("Event / Trigger", bold_label_style),
        Paragraph("Location (GPS)", bold_label_style),
        Paragraph("Integrity Check (SHA-256)", bold_label_style)
    ]]
    
    has_anomalies = False
    for c in capsules:
        triggers = []
        if c.get("route_deviation"):
            triggers.append("Route Deviation")
        if c.get("motion_anomaly"):
            triggers.append("Unusual/Isolated Stop")
        if c.get("audio_anomaly"):
            triggers.append("Audio Distress Detected")
            
        if triggers:
            has_anomalies = True
            anomaly_table_data.append([
                Paragraph(str(c["timestamp"])[:19].replace("T", " "), body_style),
                Paragraph(", ".join(triggers), bold_label_style),
                Paragraph(f"{c['latitude']:.5f}, {c['longitude']:.5f}", body_style),
                Paragraph(f"{c['integrity_hash'][:16]}...", code_style)
            ])
            
    if not has_anomalies:
        anomaly_table_data.append([
            Paragraph("N/A", body_style),
            Paragraph("No anomalies detected during this journey monitoring", body_style),
            Paragraph("N/A", body_style),
            Paragraph("N/A", body_style)
        ])
        
    anomaly_table = Table(anomaly_table_data, colWidths=[1.3*inch, 1.8*inch, 1.5*inch, 2.4*inch])
    anomaly_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F7FAFC")),
    ]))
    story.append(anomaly_table)
    story.append(Spacer(1, 15))

    # Complete GPS Telemetry (Tamper-Proof Capsule Log)
    story.append(Paragraph("Tamper-Proof Journey Capsule History (GPS Logs)", h1_style))
    story.append(Paragraph("Below is the cryptographically validated timeline of tracking telemetry recorded during monitoring.", body_style))
    story.append(Spacer(1, 8))

    telemetry_table_data = [[
        Paragraph("Timestamp", bold_label_style),
        Paragraph("Coordinates", bold_label_style),
        Paragraph("Speed (km/h)", bold_label_style),
        Paragraph("Capsule Hash (SHA-256)", bold_label_style)
    ]]

    for c in capsules:
        speed_kmh = c["speed"] * 3.6  # convert m/s to km/h
        telemetry_table_data.append([
            Paragraph(str(c["timestamp"])[:19].replace("T", " "), body_style),
            Paragraph(f"{c['latitude']:.5f}, {c['longitude']:.5f}", body_style),
            Paragraph(f"{speed_kmh:.1f}", body_style),
            Paragraph(c["integrity_hash"], code_style)
        ])

    if len(capsules) == 0:
        telemetry_table_data.append([
            Paragraph("N/A", body_style),
            Paragraph("No capsule snapshots available.", body_style),
            Paragraph("0.0", body_style),
            Paragraph("N/A", body_style)
        ])

    telemetry_table = Table(telemetry_table_data, colWidths=[1.3*inch, 1.4*inch, 0.9*inch, 3.4*inch])
    telemetry_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F7FAFC")),
    ]))
    story.append(telemetry_table)
    story.append(Spacer(1, 25))

    # Legal Disclaimer / Signature Section
    story.append(KeepTogether([
        Paragraph("Legal Certification & Chain of Custody", h1_style),
        Paragraph(
            "This report compiles cryptographic records saved client-side and server-side under strict security rules. "
            "Each tracking capsule record is sealed with a SHA-256 digital signature representing coordinates, "
            "timestamps, and anomalies at the moment of capture. Under section 65B of the Indian Evidence Act "
            "(or local equivalent electronic evidence act), this log can serve as valid digital forensic data "
            "supporting incident verification.",
            body_style
        ),
        Spacer(1, 30),
        Table([
            [Paragraph("_____________________________<br/><b>Signature of Issuer (FEMME System)</b>", body_style),
             Paragraph("_____________________________<br/><b>Signature of Victim / Reporter</b>", body_style)]
        ], colWidths=[3.5*inch, 3.5*inch], style=[('ALIGN', (0,0), (-1,-1), 'LEFT')])
    ]))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
