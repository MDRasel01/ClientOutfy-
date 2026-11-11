/* Minimal XLSX writer for LeadOutfy v26 - generates real .xlsx files */
var XLSX = (function() {
  function escXml(v) {
    if (v == null) return '';
    return String(v)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&apos;')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,''); // strip invalid XML chars
  }

  function aoa_to_sheet(data) { return data; }
  function book_new() { return { SheetNames: [], Sheets: {} }; }
  function book_append_sheet(wb, ws, name) {
    wb.SheetNames.push(name);
    wb.Sheets[name] = ws;
  }

  function uint32LE(n) { return [n&0xFF,(n>>8)&0xFF,(n>>16)&0xFF,(n>>24)&0xFF]; }
  function uint16LE(n) { return [n&0xFF,(n>>8)&0xFF]; }
  function strBytes(s) {
    var encoded = new TextEncoder().encode(s);
    return Array.from(encoded);
  }
  function crc32(bytes) {
    var table = [];
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function writeFile(wb, filename) {
    var sheetName = wb.SheetNames[0];
    var data = wb.Sheets[sheetName];

    // Build shared strings table
    var sharedStrings = [];
    var ssMap = {};
    function getSSIdx(s) {
      var str = String(s == null ? '' : s);
      if (str in ssMap) return ssMap[str];
      ssMap[str] = sharedStrings.length;
      sharedStrings.push(str);
      return sharedStrings.length - 1;
    }

    // Build sheet rows
    var rows = [];
    data.forEach(function(row, ri) {
      var cells = [];
      row.forEach(function(val, ci) {
        var col = ci < 26
          ? String.fromCharCode(65 + ci)
          : String.fromCharCode(65 + Math.floor(ci/26) - 1) + String.fromCharCode(65 + (ci%26));
        var ref = col + (ri + 1);
        var idx = getSSIdx(val);
        cells.push('<c r="' + ref + '" t="s"><v>' + idx + '</v></c>');
      });
      rows.push('<row r="' + (ri+1) + '">' + cells.join('') + '</row>');
    });

    var sheetXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
      ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetData>' + rows.join('') + '</sheetData></worksheet>';

    var ssXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
      ' count="' + sharedStrings.length + '" uniqueCount="' + sharedStrings.length + '">' +
      sharedStrings.map(function(s) {
        return '<si><t xml:space="preserve">' + escXml(s) + '</t></si>';
      }).join('') +
      '</sst>';

    var wbXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
      ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="' + escXml(sheetName) + '" sheetId="1" r:id="rId1"/></sheets>' +
      '</workbook>';

    var wbRelsXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
      '</Relationships>';

    var dotRelsXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';

    var contentTypesXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
      '</Types>';

    // Files in correct order — NO extra app.xml that was breaking Excel
    var files = [
      ['[Content_Types].xml', contentTypesXml],
      ['_rels/.rels',          dotRelsXml],
      ['xl/workbook.xml',      wbXml],
      ['xl/_rels/workbook.xml.rels', wbRelsXml],
      ['xl/worksheets/sheet1.xml',   sheetXml],
      ['xl/sharedStrings.xml', ssXml]
    ];

    // Build ZIP (store, no compression)
    var localHeaders = [];
    var centralDirs  = [];
    var offset = 0;

    files.forEach(function(f) {
      var name     = f[0];
      var fileData = strBytes(f[1]);
      var crc      = crc32(fileData);
      var nameBytes = strBytes(name);

      var lh = [0x50,0x4B,0x03,0x04,
        0x14,0x00,           // version needed: 20
        0x00,0x08,           // flags: UTF-8 (bit 11)
        0x00,0x00,           // compression: store
        0x00,0x00,0x00,0x00  // mod time/date
      ].concat(uint32LE(crc))
       .concat(uint32LE(fileData.length))
       .concat(uint32LE(fileData.length))
       .concat(uint16LE(nameBytes.length))
       .concat(uint16LE(0))
       .concat(nameBytes)
       .concat(fileData);

      var cd = [0x50,0x4B,0x01,0x02,
        0x14,0x00,0x14,0x00,
        0x00,0x08,0x00,0x00,  // flags: UTF-8 (bit 11)
        0x00,0x00,0x00,0x00
      ].concat(uint32LE(crc))
       .concat(uint32LE(fileData.length))
       .concat(uint32LE(fileData.length))
       .concat(uint16LE(nameBytes.length))
       .concat(uint16LE(0),uint16LE(0),uint16LE(0),uint16LE(0))
       .concat(uint32LE(0))
       .concat(uint32LE(offset))
       .concat(nameBytes);

      localHeaders = localHeaders.concat(lh);
      centralDirs  = centralDirs.concat(cd);
      offset += lh.length;
    });

    var eocd = [0x50,0x4B,0x05,0x06,
      0x00,0x00,0x00,0x00
    ].concat(uint16LE(files.length))
     .concat(uint16LE(files.length))
     .concat(uint32LE(centralDirs.length))
     .concat(uint32LE(offset))
     .concat(uint16LE(0));

    var all = localHeaders.concat(centralDirs).concat(eocd);
    var blob = new Blob([new Uint8Array(all).buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var url = URL.createObjectURL(blob);
    var a   = document.createElement('a');
    a.href  = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    utils: { aoa_to_sheet: aoa_to_sheet, book_new: book_new, book_append_sheet: book_append_sheet },
    writeFile: writeFile
  };
})();
