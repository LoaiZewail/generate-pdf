import puppeteer from "puppeteer";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {

        let { html } = req.body;

        if (!html) {
            return res.status(400).json({ error: "HTML content is required" });
        }

        // inject css for proper pdf formatting
        const injectedStyles = `
                <style>
                    @page {
                        size: A4;
                    }
                </style>
            `;

        html = html.replace("<head>", `<head>${injectedStyles}`);

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        await page.emulateMediaType('screen');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // await page.screenshot({ path: "/debug-screenshot.png", fullPage: true });

        const pdfBuffer = await page.pdf({
            printBackground: true,
            preferCSSPageSize: true,
            scale: 1,
        });

        await browser.close();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=generated-report.pdf");
        res.end(pdfBuffer);

    } catch (error) {
        console.error("PDF generation error:", error);
        return res.status(500).json({ error: "Failed to generate PDF" });
    }

}
