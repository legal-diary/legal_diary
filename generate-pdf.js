const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
  console.log('Starting PDF generation...');

  // Create a CSS file for styling
  const cssContent = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #333;
}
h1 {
  font-size: 24pt;
  color: #1a1a1a;
  border-bottom: 2px solid #333;
  padding-bottom: 10px;
  margin-top: 30px;
}
h2 {
  font-size: 18pt;
  color: #333;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
  margin-top: 25px;
}
h3 {
  font-size: 14pt;
  color: #444;
  margin-top: 20px;
}
h4 {
  font-size: 12pt;
  color: #555;
  margin-top: 15px;
}
code {
  background-color: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: Monaco, Consolas, monospace;
  font-size: 10pt;
}
pre {
  background-color: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  padding: 15px;
  overflow-x: auto;
  font-size: 9pt;
}
pre code {
  background: none;
  padding: 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}
th, td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}
th {
  background-color: #f5f5f5;
  font-weight: bold;
}
tr:nth-child(even) {
  background-color: #fafafa;
}
blockquote {
  border-left: 4px solid #ddd;
  padding-left: 15px;
  color: #666;
  margin: 15px 0;
}
hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 30px 0;
}
a {
  color: #0066cc;
  text-decoration: none;
}
ul, ol {
  padding-left: 25px;
}
li {
  margin-bottom: 5px;
}
`;

  const cssPath = path.join(__dirname, 'doc-styles.css');
  fs.writeFileSync(cssPath, cssContent);

  try {
    const pdf = await mdToPdf(
      { path: path.join(__dirname, 'TECHNICAL_DOCUMENTATION.md') },
      {
        dest: path.join(__dirname, 'TECHNICAL_DOCUMENTATION.pdf'),
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          },
          printBackground: true
        },
        stylesheet: cssPath
      }
    );

    if (pdf) {
      console.log('PDF generated successfully!');
      console.log('Output file:', path.join(__dirname, 'TECHNICAL_DOCUMENTATION.pdf'));
    }

    // Cleanup CSS file
    fs.unlinkSync(cssPath);
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Cleanup CSS file even on error
    if (fs.existsSync(cssPath)) {
      fs.unlinkSync(cssPath);
    }
  }
}

generatePDF();
