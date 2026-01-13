import { resolvePDFJS } from "https://esm.sh/pdfjs-serverless@0.4.2";

export class PDFService {
    /**
     * Extracts text from a PDF file
     * @param arrayBuffer The PDF file as an ArrayBuffer
     * @returns The extracted text
     */
    async extractText(arrayBuffer: ArrayBuffer): Promise<string> {
        try {
            const data = new Uint8Array(arrayBuffer);
            const { getDocument } = await resolvePDFJS();
            const doc = await getDocument({ data, useSystemFonts: true }).promise;

            const allText: string[] = [];
            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const textContent = await page.getTextContent();
                // @ts-ignore: pdf-js items have 'str' property
                const contents = textContent.items.map((item: any) => item.str).join(" ");
                allText.push(contents);
            }

            return allText.join("\n");
        } catch (error) {
            console.error("Error extracting text from PDF:", error);
            throw new Error(`Error al extraer texto del PDF: ${error instanceof Error ? error.message : "Error desconocido"}`);
        }
    }
}
