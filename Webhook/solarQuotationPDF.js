import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const generateSolarQuotationPDF = async (data) => {
  const {
    customerName = "Customer",
    phone,
    systemSize,
    price,
    subsidy,
    finalPrice
  } = data;

  const fileName = `Solar_Quotation_${phone}.pdf`;
  const filePath = path.join("tmp", fileName);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filePath));

  /* ---------- HEADER ---------- */
  doc
    .fontSize(20)
    .text("SOLAR POWER QUOTATION", { align: "center" })
    .moveDown(2);

  /* ---------- CUSTOMER ---------- */
  doc.fontSize(12);
  doc.text(`Customer Name: ${customerName}`);
  doc.text(`Mobile Number: ${phone}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  /* ---------- SYSTEM DETAILS ---------- */
  doc.fontSize(14).text("System Details", { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(12);
  doc.text(`Recommended Capacity: ${systemSize} kW`);
  doc.text(`System Type: On-Grid Solar`);
  doc.text(`Panel Type: Mono PERC`);
  doc.text(`Inverter Type: Grid-Tied`);
  doc.moveDown();

  /* ---------- PRICING ---------- */
  doc.fontSize(14).text("Pricing Summary", { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(12);
  doc.text(`Base Price: ₹ ${price}`);
  doc.text(`Government Subsidy: ₹ ${subsidy}`);
  doc.moveDown(0.5);

  doc.fontSize(13).text(`Final Payable Amount: ₹ ${finalPrice}`, {
    bold: true
  });

  doc.moveDown(2);

  /* ---------- FOOTER ---------- */
  doc
    .fontSize(10)
    .text(
      "Note: Prices are indicative and may vary after site inspection.\nSubsidy subject to government approval.",
      { align: "left" }
    );

  doc.end();

  return { filePath, fileName };
};
