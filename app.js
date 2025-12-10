// ===== Dreamwork Invoices - Main Application =====

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// ===== App Initialization =====
function initializeApp() {
    // Set default dates
    setDefaultDates();

    // Generate default invoice number
    generateInvoiceNumber();

    // Add first line item
    addLineItem();

    // Setup event listeners
    setupEventListeners();

    // Load templates from localStorage
    loadTemplates();

    // Setup PDF template selection
    setupTemplateSelection();

    // Setup PDF preview modal
    setupPreviewModal();
}

// ===== Default Values =====
function setDefaultDates() {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

    document.getElementById('invoice-date').value = formatDate(today);
    document.getElementById('due-date').value = formatDate(dueDate);
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function generateInvoiceNumber() {
    const prefix = 'INV';
    const timestamp = Date.now().toString().slice(-6);
    document.getElementById('invoice-number').value = `${prefix}-${timestamp}`;
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Add item button
    document.getElementById('add-item-btn').addEventListener('click', () => {
        addLineItem();
    });

    // Generate PDF button
    document.getElementById('generate-pdf-btn').addEventListener('click', () => {
        generatePDF();
    });

    // Tax rate change
    document.getElementById('tax-rate').addEventListener('input', () => {
        calculateTotals();
    });

    // Required fields validation for button state
    const requiredInputs = document.querySelectorAll('#from-name, #from-email, #to-name');
    requiredInputs.forEach(input => {
        input.addEventListener('input', () => {
            updateButtonState();
        });
    });

    // Form validation feedback
    const inputs = document.querySelectorAll('.input-group input, .input-group textarea');
    inputs.forEach(input => {
        input.addEventListener('invalid', (e) => {
            e.target.closest('.input-group')?.classList.add('shake');
            setTimeout(() => {
                e.target.closest('.input-group')?.classList.remove('shake');
            }, 300);
        });
    });

    // Template save button
    document.getElementById('save-template-btn').addEventListener('click', () => {
        openTemplateModal();
    });

    // Modal events
    document.getElementById('modal-close').addEventListener('click', closeTemplateModal);
    document.getElementById('modal-cancel').addEventListener('click', closeTemplateModal);
    document.getElementById('modal-save').addEventListener('click', saveTemplate);
    document.getElementById('template-modal').addEventListener('click', (e) => {
        if (e.target.id === 'template-modal') closeTemplateModal();
    });

    // Template name input - save on Enter
    document.getElementById('template-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveTemplate();
    });

    // Initial button state check
    updateButtonState();
}

// ===== Button State Management =====
function updateButtonState() {
    const fromName = document.getElementById('from-name').value.trim();
    const fromEmail = document.getElementById('from-email').value.trim();
    const toName = document.getElementById('to-name').value.trim();

    const btn = document.getElementById('generate-pdf-btn');
    const isValid = fromName && fromEmail && toName;

    btn.disabled = !isValid;
}

// ===== Line Items Management =====
let lineItemCount = 0;

function addLineItem(description = '', quantity = 1, price = 0) {
    const lineItems = document.getElementById('line-items');
    const itemId = ++lineItemCount;

    const lineItem = document.createElement('div');
    lineItem.className = 'line-item';
    lineItem.dataset.id = itemId;

    lineItem.innerHTML = `
        <input type="text"
               class="item-description"
               placeholder="Item description"
               value="${escapeHtml(description)}"
               data-field="description">
        <input type="number"
               class="item-qty"
               placeholder="Qty"
               value="${quantity}"
               min="0"
               step="1"
               data-field="quantity">
        <input type="number"
               class="item-price"
               placeholder="0.00"
               value="${price || ''}"
               min="0"
               step="0.01"
               data-field="price">
        <span class="item-total">$0.00</span>
        <button type="button" class="remove-item-btn" title="Remove item">×</button>
    `;

    // Setup line item events
    const qtyInput = lineItem.querySelector('.item-qty');
    const priceInput = lineItem.querySelector('.item-price');
    const removeBtn = lineItem.querySelector('.remove-item-btn');

    qtyInput.addEventListener('input', () => updateLineItemTotal(lineItem));
    priceInput.addEventListener('input', () => updateLineItemTotal(lineItem));
    removeBtn.addEventListener('click', () => removeLineItem(lineItem));

    // Add focus animations
    [qtyInput, priceInput, lineItem.querySelector('.item-description')].forEach(input => {
        input.addEventListener('focus', () => {
            lineItem.style.transform = 'scale(1.01)';
        });
        input.addEventListener('blur', () => {
            lineItem.style.transform = 'scale(1)';
        });
    });

    lineItems.appendChild(lineItem);

    // Focus on description field
    setTimeout(() => {
        lineItem.querySelector('.item-description').focus();
    }, 100);

    updateLineItemTotal(lineItem);
}

function removeLineItem(lineItem) {
    const lineItems = document.getElementById('line-items');

    // Don't remove if it's the last item
    if (lineItems.children.length <= 1) {
        lineItem.classList.add('shake');
        setTimeout(() => lineItem.classList.remove('shake'), 300);
        return;
    }

    // Animate out
    lineItem.classList.add('removing');

    setTimeout(() => {
        lineItem.remove();
        calculateTotals();
    }, 300);
}

function updateLineItemTotal(lineItem) {
    const qty = parseFloat(lineItem.querySelector('.item-qty').value) || 0;
    const price = parseFloat(lineItem.querySelector('.item-price').value) || 0;
    const total = qty * price;

    lineItem.querySelector('.item-total').textContent = formatCurrency(total);

    calculateTotals();
}

// ===== Calculations =====
function calculateTotals() {
    const lineItems = document.querySelectorAll('.line-item');
    let subtotal = 0;

    lineItems.forEach(item => {
        const qty = parseFloat(item.querySelector('.item-qty').value) || 0;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        subtotal += qty * price;
    });

    const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Update display with animation
    animateValue('subtotal', formatCurrency(subtotal));
    animateValue('tax-amount', formatCurrency(taxAmount));
    animateValue('total', formatCurrency(total));
}

function animateValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (element.textContent !== newValue) {
        element.style.transform = 'scale(1.05)';
        element.textContent = newValue;
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// ===== PDF Template Selection =====
let selectedTemplate = 'classic';

function setupTemplateSelection() {
    const templateCards = document.querySelectorAll('.pdf-template-card');

    // Set default selection
    templateCards.forEach(card => {
        if (card.dataset.template === selectedTemplate) {
            card.classList.add('selected');
        }

        card.addEventListener('click', () => {
            // Remove selection from all cards
            templateCards.forEach(c => c.classList.remove('selected'));
            // Add selection to clicked card
            card.classList.add('selected');
            // Update selected template
            selectedTemplate = card.dataset.template;
            // Show preview
            showPDFPreview(selectedTemplate);
        });
    });
}

// ===== PDF Preview Modal =====
function showPDFPreview(templateType) {
    const data = gatherFormData();

    // Create PDF for preview
    const doc = createPDFDocument(templateType, data);

    // Convert to image for preview
    const pdfDataUrl = doc.output('datauristring');

    // Update modal title
    const templateNames = {
        'classic': 'Classic',
        'modern': 'Modern',
        'minimal': 'Minimal'
    };
    document.getElementById('preview-template-name').textContent = templateNames[templateType];

    // Create an iframe to show the PDF
    const container = document.getElementById('pdf-preview-container');
    container.innerHTML = `<iframe src="${pdfDataUrl}" style="width: 100%; height: 500px; border: none;"></iframe>`;

    // Show modal
    document.getElementById('pdf-preview-modal').classList.add('active');
}

function closePDFPreviewModal() {
    document.getElementById('pdf-preview-modal').classList.remove('active');
}

function setupPreviewModal() {
    document.getElementById('preview-modal-close').addEventListener('click', closePDFPreviewModal);
    document.getElementById('preview-modal-cancel').addEventListener('click', closePDFPreviewModal);
    document.getElementById('pdf-preview-modal').addEventListener('click', (e) => {
        if (e.target.id === 'pdf-preview-modal') closePDFPreviewModal();
    });
    document.getElementById('preview-modal-download').addEventListener('click', () => {
        closePDFPreviewModal();
        generatePDF();
    });
}

// ===== PDF Generation =====
function generatePDF() {
    const data = gatherFormData();

    // Validate required fields
    if (!validateForm(data)) {
        return;
    }

    const doc = createPDFDocument(selectedTemplate, data);

    // Save the PDF
    const fileName = `invoice-${data.invoiceNumber}.pdf`;
    doc.save(fileName);

    // Success feedback
    showSuccessAnimation();
}

function createPDFDocument(templateType, data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    switch (templateType) {
        case 'modern':
            generatePDFModern(doc, data);
            break;
        case 'minimal':
            generatePDFMinimal(doc, data);
            break;
        case 'classic':
        default:
            generatePDFClassic(doc, data);
            break;
    }

    return doc;
}

// ===== Classic Template =====
function generatePDFClassic(doc, data) {
    // Colors - Professional dark gray theme
    const primaryColor = [31, 41, 55];      // Dark gray
    const textColor = [17, 24, 39];          // Near black
    const mutedColor = [107, 114, 128];      // Gray
    const accentColor = [55, 65, 81];        // Medium gray
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    let y = margin;

    // === Header ===
    doc.setFontSize(28);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', margin, y);

    // Invoice number on the right
    doc.setFontSize(11);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${data.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });

    y += 18;

    // === From / To Section ===
    const colWidth = contentWidth / 2 - 10;

    // From
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM', margin, y);

    // To
    doc.text('BILL TO', margin + colWidth + 20, y);

    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.setFontSize(10);

    // From details
    let fromY = y;
    doc.setFont('helvetica', 'bold');
    doc.text(data.fromName || '', margin, fromY);
    doc.setFont('helvetica', 'normal');
    fromY += 5;
    if (data.fromEmail) {
        doc.setFontSize(9);
        doc.text(data.fromEmail, margin, fromY);
        fromY += 4;
    }
    if (data.fromPhone) {
        doc.text(data.fromPhone, margin, fromY);
        fromY += 4;
    }
    if (data.fromAddress) {
        const addressLines = doc.splitTextToSize(data.fromAddress, colWidth);
        addressLines.forEach(line => {
            doc.text(line, margin, fromY);
            fromY += 4;
        });
    }

    // To details
    let toY = y;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(data.toName || '', margin + colWidth + 20, toY);
    doc.setFont('helvetica', 'normal');
    toY += 5;
    if (data.toEmail) {
        doc.setFontSize(9);
        doc.text(data.toEmail, margin + colWidth + 20, toY);
        toY += 4;
    }
    if (data.toAddress) {
        const addressLines = doc.splitTextToSize(data.toAddress, colWidth);
        addressLines.forEach(line => {
            doc.text(line, margin + colWidth + 20, toY);
            toY += 4;
        });
    }

    y = Math.max(fromY, toY) + 10;

    // === Dates ===
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);

    const dateX = pageWidth - margin - 60;
    doc.text('Issue Date:', dateX, y);
    doc.setTextColor(...textColor);
    doc.text(formatDisplayDate(data.invoiceDate), dateX + 35, y);

    y += 5;
    doc.setTextColor(...mutedColor);
    doc.text('Due Date:', dateX, y);
    doc.setTextColor(...textColor);
    doc.text(formatDisplayDate(data.dueDate), dateX + 35, y);

    y += 15;

    // === Items Table ===
    // Table header with dark background
    doc.setFillColor(...accentColor);
    doc.rect(margin, y - 4, contentWidth, 10, 'F');

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', margin + 4, y + 2);
    doc.text('QTY', margin + 100, y + 2);
    doc.text('PRICE', margin + 120, y + 2);
    doc.text('TOTAL', pageWidth - margin - 4, y + 2, { align: 'right' });

    y += 12;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.setFontSize(9);

    data.items.forEach((item, index) => {
        if (y > 250) {
            doc.addPage();
            y = margin;
        }

        // Alternate row background
        if (index % 2 === 1) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, y - 4, contentWidth, 8, 'F');
        }

        const descLines = doc.splitTextToSize(item.description || 'Item', 85);
        doc.text(descLines[0], margin + 4, y);
        doc.text(item.quantity.toString(), margin + 100, y);
        doc.text(formatCurrency(item.price), margin + 120, y);
        doc.text(formatCurrency(item.total), pageWidth - margin - 4, y, { align: 'right' });

        y += 8;
    });

    y += 10;

    // === Totals ===
    const totalsX = pageWidth - margin - 70;

    // Line above totals
    doc.setDrawColor(229, 231, 235);
    doc.line(totalsX - 10, y, pageWidth - margin, y);

    y += 8;

    // Subtotal
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text('Subtotal', totalsX, y);
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(data.subtotal), pageWidth - margin, y, { align: 'right' });

    y += 7;

    // Tax
    doc.setTextColor(...mutedColor);
    doc.text(`Tax (${data.taxRate}%)`, totalsX, y);
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(data.taxAmount), pageWidth - margin, y, { align: 'right' });

    y += 10;

    // Total
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total', totalsX, y);
    doc.setFontSize(14);
    doc.text(formatCurrency(data.total), pageWidth - margin, y, { align: 'right' });

    y += 15;

    // === Notes ===
    if (data.notes) {
        y += 5;
        doc.setTextColor(...mutedColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('NOTES', margin, y);

        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);
        const noteLines = doc.splitTextToSize(data.notes, contentWidth);
        noteLines.forEach(line => {
            doc.text(line, margin, y);
            y += 5;
        });
    }

    // === Bank Details ===
    if (data.bankName || data.bankSwift || data.bankIban || data.bankAccountName) {
        y += 10;
        doc.setTextColor(...mutedColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('BANK DETAILS', margin, y);

        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);
        doc.setFontSize(9);

        if (data.bankName) {
            doc.text(`Bank: ${data.bankName}`, margin, y);
            y += 4;
        }
        if (data.bankAccountName) {
            doc.text(`Account Name: ${data.bankAccountName}`, margin, y);
            y += 4;
        }
        if (data.bankIban) {
            doc.text(`IBAN: ${data.bankIban}`, margin, y);
            y += 4;
        }
        if (data.bankSwift) {
            doc.text(`SWIFT/BIC: ${data.bankSwift}`, margin, y);
            y += 4;
        }
    }

    // === Thank You Message ===
    y += 15;
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });

    // === Footer ===
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated with Dreamwork Invoices', pageWidth / 2, footerY, { align: 'center' });
}

// ===== Modern Template =====
function generatePDFModern(doc, data) {
    // Colors - Bold blue/indigo theme
    const primaryColor = [59, 130, 246];     // Blue
    const secondaryColor = [30, 58, 138];    // Dark blue
    const textColor = [17, 24, 39];          // Near black
    const mutedColor = [107, 114, 128];      // Gray
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // === Full-width header background ===
    doc.setFillColor(...secondaryColor);
    doc.rect(0, 0, pageWidth, 50, 'F');

    let y = 20;

    // === Header ===
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', margin, y + 8);

    // Invoice number and dates on the right
    doc.setFontSize(10);
    doc.setTextColor(147, 197, 253);  // Light blue
    doc.setFont('helvetica', 'normal');
    doc.text(`#${data.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });
    y += 6;
    doc.setFontSize(9);
    doc.text(`Issue: ${formatDisplayDate(data.invoiceDate)}`, pageWidth - margin, y + 6, { align: 'right' });
    doc.text(`Due: ${formatDisplayDate(data.dueDate)}`, pageWidth - margin, y + 12, { align: 'right' });

    y = 65;

    // === From / To Section ===
    const colWidth = contentWidth / 2 - 15;

    // From box with border
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, colWidth, 45, 3, 3, 'S');

    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM', margin + 8, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    let fromY = y + 18;
    doc.setFont('helvetica', 'bold');
    doc.text(data.fromName || '', margin + 8, fromY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    fromY += 5;
    if (data.fromEmail) {
        doc.text(data.fromEmail, margin + 8, fromY);
        fromY += 4;
    }
    if (data.fromPhone) {
        doc.text(data.fromPhone, margin + 8, fromY);
        fromY += 4;
    }
    if (data.fromAddress) {
        const addressLines = doc.splitTextToSize(data.fromAddress, colWidth - 16);
        addressLines.slice(0, 2).forEach(line => {
            doc.text(line, margin + 8, fromY);
            fromY += 4;
        });
    }

    // To box with filled background
    doc.setFillColor(239, 246, 255);  // Light blue background
    doc.roundedRect(margin + colWidth + 10, y, colWidth, 45, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', margin + colWidth + 18, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    let toY = y + 18;
    doc.setFont('helvetica', 'bold');
    doc.text(data.toName || '', margin + colWidth + 18, toY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    toY += 5;
    if (data.toEmail) {
        doc.text(data.toEmail, margin + colWidth + 18, toY);
        toY += 4;
    }
    if (data.toAddress) {
        const addressLines = doc.splitTextToSize(data.toAddress, colWidth - 16);
        addressLines.slice(0, 2).forEach(line => {
            doc.text(line, margin + colWidth + 18, toY);
            toY += 4;
        });
    }

    y += 55;

    // === Items Table ===
    // Table header with gradient effect (solid blue)
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', margin + 8, y + 8);
    doc.text('QTY', margin + 105, y + 8);
    doc.text('PRICE', margin + 125, y + 8);
    doc.text('TOTAL', pageWidth - margin - 8, y + 8, { align: 'right' });

    y += 18;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.setFontSize(9);

    data.items.forEach((item, index) => {
        if (y > 240) {
            doc.addPage();
            y = margin;
        }

        // Alternate row background
        if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 5, contentWidth, 10, 'F');
        }

        const descLines = doc.splitTextToSize(item.description || 'Item', 90);
        doc.text(descLines[0], margin + 8, y);
        doc.text(item.quantity.toString(), margin + 105, y);
        doc.text(formatCurrency(item.price), margin + 125, y);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(item.total), pageWidth - margin - 8, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');

        y += 10;
    });

    y += 10;

    // === Totals box ===
    const totalsWidth = 90;
    const totalsX = pageWidth - margin - totalsWidth;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(totalsX, y, totalsWidth, 45, 3, 3, 'F');

    y += 10;

    // Subtotal
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text('Subtotal', totalsX + 8, y);
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(data.subtotal), pageWidth - margin - 8, y, { align: 'right' });

    y += 8;

    // Tax
    doc.setTextColor(...mutedColor);
    doc.text(`Tax (${data.taxRate}%)`, totalsX + 8, y);
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(data.taxAmount), pageWidth - margin - 8, y, { align: 'right' });

    y += 12;

    // Total with blue highlight
    doc.setFillColor(...primaryColor);
    doc.roundedRect(totalsX + 4, y - 5, totalsWidth - 8, 14, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL', totalsX + 10, y + 4);
    doc.setFontSize(12);
    doc.text(formatCurrency(data.total), pageWidth - margin - 10, y + 4, { align: 'right' });

    y += 25;

    // === Notes ===
    if (data.notes) {
        doc.setTextColor(...primaryColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('NOTES', margin, y);

        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);
        const noteLines = doc.splitTextToSize(data.notes, contentWidth);
        noteLines.forEach(line => {
            doc.text(line, margin, y);
            y += 5;
        });
        y += 5;
    }

    // === Bank Details ===
    if (data.bankName || data.bankSwift || data.bankIban || data.bankAccountName) {
        doc.setTextColor(...primaryColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('PAYMENT DETAILS', margin, y);

        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textColor);
        doc.setFontSize(9);

        if (data.bankName) {
            doc.text(`Bank: ${data.bankName}`, margin, y);
            y += 4;
        }
        if (data.bankAccountName) {
            doc.text(`Account: ${data.bankAccountName}`, margin, y);
            y += 4;
        }
        if (data.bankIban) {
            doc.text(`IBAN: ${data.bankIban}`, margin, y);
            y += 4;
        }
        if (data.bankSwift) {
            doc.text(`SWIFT: ${data.bankSwift}`, margin, y);
        }
    }

    // === Footer ===
    doc.setFillColor(...secondaryColor);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 10, { align: 'center' });
}

// ===== Minimal Template =====
function generatePDFMinimal(doc, data) {
    // Colors - Clean, subtle theme
    const textColor = [17, 24, 39];          // Near black
    const mutedColor = [156, 163, 175];      // Light gray
    const borderColor = [229, 231, 235];     // Very light gray
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 25;
    const contentWidth = pageWidth - (margin * 2);

    let y = 30;

    // === Header - Simple and clean ===
    doc.setFontSize(11);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text('INVOICE', margin, y);

    // Invoice number on the right
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`#${data.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });

    y += 8;

    // Thin line under header
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    y += 20;

    // === From / To Section - Side by side ===
    const colWidth = contentWidth / 2 - 20;

    // From
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text('From', margin, y);

    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    let fromY = y + 6;
    doc.setFont('helvetica', 'bold');
    doc.text(data.fromName || '', margin, fromY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    fromY += 5;
    if (data.fromEmail) {
        doc.text(data.fromEmail, margin, fromY);
        fromY += 4;
    }
    if (data.fromPhone) {
        doc.text(data.fromPhone, margin, fromY);
        fromY += 4;
    }
    if (data.fromAddress) {
        const addressLines = doc.splitTextToSize(data.fromAddress, colWidth);
        addressLines.forEach(line => {
            doc.text(line, margin, fromY);
            fromY += 4;
        });
    }

    // To
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text('Bill To', margin + colWidth + 40, y);

    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    let toY = y + 6;
    doc.setFont('helvetica', 'bold');
    doc.text(data.toName || '', margin + colWidth + 40, toY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    toY += 5;
    if (data.toEmail) {
        doc.text(data.toEmail, margin + colWidth + 40, toY);
        toY += 4;
    }
    if (data.toAddress) {
        const addressLines = doc.splitTextToSize(data.toAddress, colWidth);
        addressLines.forEach(line => {
            doc.text(line, margin + colWidth + 40, toY);
            toY += 4;
        });
    }

    y = Math.max(fromY, toY) + 15;

    // === Dates - Small and subtle ===
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.text(`Issued: ${formatDisplayDate(data.invoiceDate)}    Due: ${formatDisplayDate(data.dueDate)}`, margin, y);

    y += 15;

    // === Items Table ===
    // Table header - simple underline
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Description', margin, y);
    doc.text('Qty', margin + 95, y);
    doc.text('Price', margin + 115, y);
    doc.text('Amount', pageWidth - margin, y, { align: 'right' });

    y += 3;
    doc.setDrawColor(...borderColor);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Table rows
    doc.setTextColor(...textColor);
    doc.setFontSize(9);

    data.items.forEach((item, index) => {
        if (y > 250) {
            doc.addPage();
            y = margin;
        }

        const descLines = doc.splitTextToSize(item.description || 'Item', 85);
        doc.text(descLines[0], margin, y);
        doc.text(item.quantity.toString(), margin + 95, y);
        doc.text(formatCurrency(item.price), margin + 115, y);
        doc.text(formatCurrency(item.total), pageWidth - margin, y, { align: 'right' });

        y += 8;
    });

    // Line after items
    y += 2;
    doc.setDrawColor(...borderColor);
    doc.line(margin + 80, y, pageWidth - margin, y);
    y += 10;

    // === Totals - Right aligned, clean ===
    const totalsX = pageWidth - margin - 60;

    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text('Subtotal', totalsX, y);
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(data.subtotal), pageWidth - margin, y, { align: 'right' });

    y += 6;
    doc.setTextColor(...mutedColor);
    doc.text(`Tax ${data.taxRate}%`, totalsX, y);
    doc.setTextColor(...textColor);
    doc.text(formatCurrency(data.taxAmount), pageWidth - margin, y, { align: 'right' });

    y += 10;

    // Total - Larger, bold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...textColor);
    doc.text('Total', totalsX, y);
    doc.setFontSize(14);
    doc.text(formatCurrency(data.total), pageWidth - margin, y, { align: 'right' });

    y += 20;

    // === Notes ===
    if (data.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...mutedColor);
        doc.text('Notes', margin, y);

        y += 5;
        doc.setFontSize(9);
        doc.setTextColor(...textColor);
        const noteLines = doc.splitTextToSize(data.notes, contentWidth);
        noteLines.forEach(line => {
            doc.text(line, margin, y);
            y += 4;
        });
        y += 6;
    }

    // === Bank Details ===
    if (data.bankName || data.bankSwift || data.bankIban || data.bankAccountName) {
        doc.setFontSize(8);
        doc.setTextColor(...mutedColor);
        doc.text('Payment Details', margin, y);

        y += 5;
        doc.setFontSize(9);
        doc.setTextColor(...textColor);

        const bankInfo = [];
        if (data.bankName) bankInfo.push(`${data.bankName}`);
        if (data.bankAccountName) bankInfo.push(`Account: ${data.bankAccountName}`);
        if (data.bankIban) bankInfo.push(`IBAN: ${data.bankIban}`);
        if (data.bankSwift) bankInfo.push(`SWIFT: ${data.bankSwift}`);

        doc.text(bankInfo.join('  |  '), margin, y);
    }

    // === Footer ===
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your business', pageWidth / 2, footerY, { align: 'center' });
}

function gatherFormData() {
    // Get all line items
    const itemElements = document.querySelectorAll('.line-item');
    const items = [];
    let subtotal = 0;

    itemElements.forEach(item => {
        const description = item.querySelector('.item-description').value;
        const quantity = parseFloat(item.querySelector('.item-qty').value) || 0;
        const price = parseFloat(item.querySelector('.item-price').value) || 0;
        const total = quantity * price;

        if (description || quantity || price) {
            items.push({ description, quantity, price, total });
            subtotal += total;
        }
    });

    const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return {
        fromName: document.getElementById('from-name').value,
        fromEmail: document.getElementById('from-email').value,
        fromPhone: document.getElementById('from-phone').value,
        fromAddress: document.getElementById('from-address').value,
        toName: document.getElementById('to-name').value,
        toEmail: document.getElementById('to-email').value,
        toAddress: document.getElementById('to-address').value,
        invoiceNumber: document.getElementById('invoice-number').value,
        invoiceDate: document.getElementById('invoice-date').value,
        dueDate: document.getElementById('due-date').value,
        items,
        taxRate,
        subtotal,
        taxAmount,
        total,
        notes: document.getElementById('notes').value,
        bankName: document.getElementById('bank-name')?.value || '',
        bankAccountName: document.getElementById('bank-account-name')?.value || '',
        bankIban: document.getElementById('bank-iban')?.value || '',
        bankSwift: document.getElementById('bank-swift')?.value || ''
    };
}

function validateForm(data) {
    const requiredFields = [
        { value: data.fromName, name: 'Your Name', id: 'from-name' },
        { value: data.fromEmail, name: 'Your Email', id: 'from-email' },
        { value: data.toName, name: 'Client Name', id: 'to-name' },
        { value: data.invoiceNumber, name: 'Invoice Number', id: 'invoice-number' },
        { value: data.invoiceDate, name: 'Invoice Date', id: 'invoice-date' },
        { value: data.dueDate, name: 'Due Date', id: 'due-date' }
    ];

    for (const field of requiredFields) {
        if (!field.value || field.value.trim() === '') {
            const element = document.getElementById(field.id);
            element.focus();
            element.closest('.input-group')?.classList.add('shake');
            setTimeout(() => {
                element.closest('.input-group')?.classList.remove('shake');
            }, 300);
            return false;
        }
    }

    if (data.items.length === 0) {
        document.querySelector('.line-item .item-description')?.focus();
        return false;
    }

    return true;
}

function formatDisplayDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showSuccessAnimation() {
    const btn = document.getElementById('generate-pdf-btn');
    const originalContent = btn.innerHTML;

    btn.innerHTML = `
        <span class="btn-content">
            <span>✓ Downloaded!</span>
        </span>
    `;
    btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.style.background = '';
    }, 2000);
}

// ===== Template Management =====
const TEMPLATES_STORAGE_KEY = 'dreamwork-invoice-templates';

function loadTemplates() {
    renderTemplates();
}

function getTemplates() {
    try {
        const templates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
        return templates ? JSON.parse(templates) : [];
    } catch (e) {
        console.error('Error loading templates:', e);
        return [];
    }
}

function saveTemplates(templates) {
    try {
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
        console.error('Error saving templates:', e);
    }
}

function renderTemplates() {
    const templates = getTemplates();
    const templatesList = document.getElementById('templates-list');
    const noTemplates = document.getElementById('no-templates');

    // Clear existing templates (keep no-templates div)
    const existingItems = templatesList.querySelectorAll('.template-item');
    existingItems.forEach(item => item.remove());

    if (templates.length === 0) {
        noTemplates.style.display = 'block';
        return;
    }

    noTemplates.style.display = 'none';

    templates.forEach(template => {
        const item = document.createElement('div');
        item.className = 'template-item';
        item.dataset.id = template.id;

        item.innerHTML = `
            <div class="template-info" onclick="loadTemplate('${template.id}')">
                <span class="template-name">${escapeHtml(template.name)}</span>
                <span class="template-date">${formatDisplayDate(template.createdAt)}</span>
            </div>
            <button type="button" class="template-delete" onclick="deleteTemplate('${template.id}')" title="Delete template">×</button>
        `;

        templatesList.appendChild(item);
    });
}

function openTemplateModal() {
    const modal = document.getElementById('template-modal');
    const input = document.getElementById('template-name');
    modal.classList.add('active');
    input.value = '';
    input.focus();
}

function closeTemplateModal() {
    const modal = document.getElementById('template-modal');
    modal.classList.remove('active');
}

function saveTemplate() {
    const nameInput = document.getElementById('template-name');
    const name = nameInput.value.trim();

    if (!name) {
        nameInput.classList.add('shake');
        setTimeout(() => nameInput.classList.remove('shake'), 300);
        return;
    }

    const templates = getTemplates();
    const formData = gatherFormData();

    // Create template object (excluding calculated fields)
    const template = {
        id: 'tpl-' + Date.now(),
        name: name,
        createdAt: new Date().toISOString().split('T')[0],
        data: {
            fromName: formData.fromName,
            fromEmail: formData.fromEmail,
            fromPhone: formData.fromPhone,
            fromAddress: formData.fromAddress,
            toName: formData.toName,
            toEmail: formData.toEmail,
            toAddress: formData.toAddress,
            taxRate: formData.taxRate,
            notes: formData.notes,
            bankName: formData.bankName,
            bankAccountName: formData.bankAccountName,
            bankIban: formData.bankIban,
            bankSwift: formData.bankSwift,
            items: formData.items
        }
    };

    templates.unshift(template); // Add to beginning
    saveTemplates(templates);
    renderTemplates();
    closeTemplateModal();

    // Show success feedback
    const saveBtn = document.getElementById('save-template-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span>✓ Saved!</span>';
    saveBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.style.background = '';
    }, 1500);
}

function loadTemplate(id) {
    const templates = getTemplates();
    const template = templates.find(t => t.id === id);

    if (!template) return;

    const data = template.data;

    // Fill form fields
    document.getElementById('from-name').value = data.fromName || '';
    document.getElementById('from-email').value = data.fromEmail || '';
    document.getElementById('from-phone').value = data.fromPhone || '';
    document.getElementById('from-address').value = data.fromAddress || '';
    document.getElementById('to-name').value = data.toName || '';
    document.getElementById('to-email').value = data.toEmail || '';
    document.getElementById('to-address').value = data.toAddress || '';
    document.getElementById('tax-rate').value = data.taxRate || 0;
    document.getElementById('notes').value = data.notes || '';
    document.getElementById('bank-name').value = data.bankName || '';
    document.getElementById('bank-account-name').value = data.bankAccountName || '';
    document.getElementById('bank-iban').value = data.bankIban || '';
    document.getElementById('bank-swift').value = data.bankSwift || '';

    // Load line items if present
    if (data.items && data.items.length > 0) {
        const lineItems = document.getElementById('line-items');
        lineItems.innerHTML = '';
        lineItemCount = 0;

        data.items.forEach(item => {
            addLineItem(item.description, item.quantity, item.price);
        });
    }

    // Update totals and button state
    calculateTotals();
    updateButtonState();

    // Trigger input events to update floating labels
    document.querySelectorAll('.input-group input, .input-group textarea').forEach(input => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Highlight the selected template
    document.querySelectorAll('.template-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.template-item[data-id="${id}"]`)?.classList.add('active');

    // Scroll to form
    document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteTemplate(id) {
    if (!confirm('Delete this template?')) return;

    const templates = getTemplates();
    const updatedTemplates = templates.filter(t => t.id !== id);
    saveTemplates(updatedTemplates);
    renderTemplates();
}

// ===== Utility Functions =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
