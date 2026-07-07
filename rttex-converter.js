// rttex-converter.js - RTTEX Converter Tools

document.addEventListener('DOMContentLoaded', function() {
    // Inisialisasi event listeners untuk RTTEX Converter
    initRTTEXConverter();
});

function initRTTEXConverter() {
    // RTTEX to PNG
    const rttexToPngBtn = document.getElementById('rttex_to_png');
    if (rttexToPngBtn) {
        rttexToPngBtn.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.rttex';
            input.style.display = 'none';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) rttexToPng(file);
            };
            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        });
    }

    // PNG to RTTEX
    const pngToRttexBtn = document.getElementById('png_to_rttex');
    if (pngToRttexBtn) {
        pngToRttexBtn.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.style.display = 'none';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) pngToRttex(file);
            };
            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        });
    }

    // Download Image button
    const downloadBtn = document.getElementById('download_image_rttex');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            const canvas = document.getElementById('canvas_result_rttex');
            if (canvas) {
                const link = document.createElement('a');
                link.download = 'rttex_output.png';
                link.href = canvas.toDataURL();
                link.click();
            }
        });
    }
}

// ========== UTILITY FUNCTIONS ==========

function readBufferNumber(buffer, pos, len) {
    let value = 0;
    for (let a = 0; a < len; a++) {
        value += buffer[pos + a] << (a * 8);
    }
    return value;
}

function writeBufferNumber(dest, pos, len, value) {
    for (let a = 0; a < len; a++) {
        dest[pos + a] = (value >> (a * 8)) & 255;
    }
}

function readBufferString(buffer, pos, len) {
    let result = '';
    for (let a = 0; a < len; a++) {
        result += String.fromCharCode(buffer[a + pos]);
    }
    return result;
}

function hashBuffer(buffer, element, text) {
    let hash = 0x55555555;
    const toBuffer = new Uint8Array(buffer);
    for (let a = 0; a < toBuffer.length; a++) {
        hash = (hash >>> 27) + (hash << 5) + toBuffer[a];
    }
    document.getElementById(element).innerHTML = text + hash;
}

function saveDataBuffer(data, fileName) {
    const blob = new Blob([new Uint8Array(data)], { type: 'octet/stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ========== RTTEX TO PNG ==========

function processRttexToPng(arrayBuffer) {
    // Check if it's RTPACK compressed
    if (readBufferString(arrayBuffer, 0, 6) === 'RTPACK') {
        arrayBuffer = pako.inflate(arrayBuffer.slice(32));
    }
    
    if (readBufferString(arrayBuffer, 0, 6) === 'RTTXTR') {
        const packedHeight = readBufferNumber(arrayBuffer, 8, 4);
        const packedWidth = readBufferNumber(arrayBuffer, 12, 2);
        const usesAlpha = arrayBuffer[0x1c];

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = packedWidth;
        canvas.height = packedHeight;

        const imageData = context.createImageData(packedWidth, packedHeight);
        imageData.data.set(new Uint8ClampedArray(arrayBuffer.slice(0x7c, 0x7c + packedHeight * packedWidth * (3 + usesAlpha))));
        context.putImageData(imageData, 0, 0);

        return canvas;
    } else {
        showToast('Not a valid RTTEX File', 'error');
        return null;
    }
}

function rttexToPng(file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = function(e) {
        const arrayBuffer = new Uint8Array(reader.result);
        const canvas = processRttexToPng(arrayBuffer);
        
        if (canvas) {
            const resultCanvas = document.getElementById('canvas_result_rttex');
            const context = resultCanvas.getContext('2d');
            resultCanvas.width = canvas.width;
            resultCanvas.height = canvas.height;
            context.scale(1, -1);
            context.drawImage(canvas, 0, -canvas.height);

            document.getElementById('download_image_rttex').classList.remove('d-none');
            document.getElementById('rttex_result_container').classList.remove('d-none');
            
            // Auto download if enabled
            const autoDownload = document.getElementById('auto_download_rttex');
            if (autoDownload && autoDownload.checked) {
                const link = document.createElement('a');
                link.download = file.name.split('.')[0] + '.png';
                link.href = resultCanvas.toDataURL();
                link.click();
            }
            
            showToast('RTTEX converted to PNG successfully!', 'success');
        }
    };
}

// ========== PNG TO RTTEX ==========

function processPngToRttex(img) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    context.scale(1, -1);
    context.drawImage(img, 0, -img.height);
    
    const imageData = context.getImageData(0, 0, img.width, img.height);
    const pixelBuffer = new Uint8Array(imageData.data.buffer);
    
    // RTTEX header
    const RTTEXBuffer = [0x52, 0x54, 0x54, 0x58, 0x54, 0x52];
    
    writeBufferNumber(RTTEXBuffer, 8, 4, img.height);
    writeBufferNumber(RTTEXBuffer, 12, 4, img.width);
    writeBufferNumber(RTTEXBuffer, 16, 4, 5121);
    writeBufferNumber(RTTEXBuffer, 20, 4, img.height);
    writeBufferNumber(RTTEXBuffer, 24, 4, img.width);
    RTTEXBuffer[28] = 1;
    RTTEXBuffer[29] = 0;
    writeBufferNumber(RTTEXBuffer, 32, 4, 1);
    writeBufferNumber(RTTEXBuffer, 100, 4, img.height);
    writeBufferNumber(RTTEXBuffer, 104, 4, img.width);
    writeBufferNumber(RTTEXBuffer, 108, 4, pixelBuffer.length);
    writeBufferNumber(RTTEXBuffer, 112, 4, 0);
    writeBufferNumber(RTTEXBuffer, 116, 4, 0);
    writeBufferNumber(RTTEXBuffer, 120, 4, 0);
    
    // Compress with pako
    const deflateBuffer = pako.deflate(new Uint8Array([...RTTEXBuffer, ...pixelBuffer]));
    
    // RTPACK header
    const RTPACKBuffer = [0x52, 0x54, 0x50, 0x41, 0x43, 0x4B];
    writeBufferNumber(RTPACKBuffer, 8, 4, deflateBuffer.length);
    writeBufferNumber(RTPACKBuffer, 12, 4, 0x7c + pixelBuffer.length);
    RTPACKBuffer[16] = 1;
    for (let a = 17; a < 32; a++) RTPACKBuffer[a] = 0;
    
    return new Uint8Array([...RTPACKBuffer, ...deflateBuffer]);
}

function pngToRttex(file) {
    if (!file.type.includes('image')) {
        showToast('Not a valid Image File', 'error');
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = function() {
            const result = processPngToRttex(img);
            hashBuffer(result, 'rttex_hash_file', 'RTTEX Hash File: ');
            saveDataBuffer(result, file.name.split('.')[0] + '.rttex');
            showToast('PNG converted to RTTEX successfully!', 'success');
        };
    };
}

// ========== TOAST NOTIFICATION ==========

function showToast(message, type = 'info') {
    const toast = document.getElementById('toastCopy');
    if (!toast) {
        // Fallback: alert jika toast tidak ada
        alert(message);
        return;
    }
    
    const colors = {
        success: '#4ade80',
        error: '#ff2d95',
        info: '#00f0ff'
    };
    
    toast.textContent = message;
    toast.style.borderColor = colors[type] || colors.info;
    toast.style.color = colors[type] || '#eef5ff';
    toast.classList.add('show');
    
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
        toast.style.borderColor = 'rgba(0, 255, 255, 0.1)';
        toast.style.color = '#eef5ff';
    }, 3000);
}