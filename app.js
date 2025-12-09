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

// ===== PDF Generation =====
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Gather form data
    const data = gatherFormData();

    // Validate required fields
    if (!validateForm(data)) {
        return;
    }

    // PDF styling constants
    const primaryColor = [249, 115, 22];
    const textColor = [30, 27, 75];
    const mutedColor = [107, 114, 128];
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    let y = margin;

    // === Header ===
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', margin, y);

    // Invoice number on the right
    doc.setFontSize(12);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${data.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });

    y += 15;

    // === From / To Section ===
    const colWidth = contentWidth / 2 - 10;

    // From
    doc.setFontSize(10);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM', margin, y);

    // To
    doc.text('BILL TO', margin + colWidth + 20, y);

    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.setFontSize(11);

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
    doc.setFontSize(11);
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
    // Table header
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y - 4, contentWidth, 10, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', margin + 4, y + 2);
    doc.text('QTY', margin + 100, y + 2);
    doc.text('PRICE', margin + 120, y + 2);
    doc.text('TOTAL', pageWidth - margin - 4, y + 2, { align: 'right' });

    y += 12;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.setFontSize(10);

    data.items.forEach((item, index) => {
        if (y > 250) {
            doc.addPage();
            y = margin;
        }

        // Alternate row background
        if (index % 2 === 1) {
            doc.setFillColor(252, 252, 253);
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
    doc.setFontSize(10);
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
    doc.setFontSize(12);
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
    doc.setFontSize(11);
    doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });

    // === Footer ===
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated with Dreamwork Invoices', pageWidth / 2, footerY, { align: 'center' });

    // Save the PDF
    const fileName = `invoice-${data.invoiceNumber}.pdf`;
    doc.save(fileName);

    // Success feedback
    showSuccessAnimation();
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

// ===== Utility Functions =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
