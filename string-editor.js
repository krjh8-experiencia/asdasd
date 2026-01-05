document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const filenameSpan = document.getElementById("filename");
  const stringList = document.getElementById("stringList");
  const editor = document.getElementById("editor");
  const downloadBtn = document.getElementById("downloadBtn");

  let zip = null;
  let classFiles = [];
  let stringsData = []; // {className, stringValue, indexInClass}
  let currentIndex = -1;
  let currentFileName = "";

  // Función para leer strings del pool de constantes de un class (simple)
  function extractStringsFromClass(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let strings = [];

    if (bytes[0] !== 0xCA || bytes[1] !== 0xFE || bytes[2] !== 0xBA || bytes[3] !== 0xBE) {
      return []; // no es class
    }

    let i = 8; // después de header y minor/major version
    const constantPoolCount = (bytes[i] << 8) | bytes[i+1];
    i += 2;

    const pool = [null]; // indice 1-based
    let idx = 1;
    while (idx < constantPoolCount) {
      const tag = bytes[i++];
      switch(tag) {
        case 1: { // UTF-8
          const length = (bytes[i] << 8) | bytes[i+1];
          i += 2;
          const strBytes = bytes.slice(i, i + length);
          const str = new TextDecoder("utf-8").decode(strBytes);
          pool.push(str);
          i += length;
          break;
        }
        case 3: case 4: i+=4; pool.push(null); break; // int, float
        case 5: case 6: i+=8; pool.push(null); idx++; break; // long, double (2 entries)
        case 7: case 8: i+=2; pool.push(null); break; // class, string
        case 9: case 10: case 11: case 12: case 15: case 16: case 18: i += tag===15?3: tag===16?3: tag===18?4:4; pool.push(null); break;
        default: pool.push(null); break;
      }
      idx++;
    }

    for (let s of pool) if (typeof s === "string") strings.push(s);
    return strings;
  }

  function renderStringList() {
    stringList.innerHTML = "";
    stringsData.forEach((s,i) => {
      const div = document.createElement("div");
      div.className = "stringItem";
      div.textContent = s.stringValue;
      div.onclick = () => {
        currentIndex = i;
        editor.value = s.stringValue;
      };
      stringList.appendChild(div);
    });
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    currentFileName = file.name;
    filenameSpan.textContent = currentFileName;

    zip = await JSZip.loadAsync(file);

    // Obtener todos los .class
    classFiles = [];
    stringsData = [];
    zip.forEach((relPath, fileObj) => {
      if (relPath.endsWith(".class")) classFiles.push(relPath);
    });

    for (let classFile of classFiles) {
      const arrayBuffer = await zip.file(classFile).async("arraybuffer");
      const strings = extractStringsFromClass(arrayBuffer);
      strings.forEach((str, idx) => stringsData.push({
        className: classFile,
        stringValue: str,
        indexInClass: idx
      }));
    }

    renderStringList();
    editor.value = "";
  });

  editor.addEventListener("input", () => {
    if (currentIndex < 0) return;
    stringsData[currentIndex].stringValue = editor.value;
  });

  downloadBtn.addEventListener("click", async () => {
    if (!zip) return alert("No hay JAR cargado");

    // Modificar cada class con strings actualizados
    for (let classFile of classFiles) {
      const arrayBuffer = await zip.file(classFile).async("arraybuffer");
      const bytes = new Uint8Array(arrayBuffer);
      let i = 8;
      const constantPoolCount = (bytes[i] << 8) | bytes[i+1];
      i += 2;
      const pool = [null];
      let idx = 1, strIndexInClass = 0;
      while (idx < constantPoolCount) {
        const tag = bytes[i++];
        switch(tag) {
          case 1: { // UTF-8
            const length = (bytes[i] << 8) | bytes[i+1];
            i += 2;
            if (stringsData.find(s => s.className===classFile && s.indexInClass===strIndexInClass)) {
              const newStr = stringsData.find(s => s.className===classFile && s.indexInClass===strIndexInClass).stringValue;
              const strBytes = new TextEncoder().encode(newStr);
              bytes.set([(strBytes.length >> 8)&0xFF, strBytes.length & 0xFF], i-2);
              bytes.set(strBytes, i);
            }
            i += length;
            strIndexInClass++;
            pool.push(null);
            break;
          }
          case 3: case 4: i+=4; pool.push(null); break;
          case 5: case 6: i+=8; pool.push(null); idx++; break;
          case 7: case 8: i+=2; pool.push(null); break;
          case 9: case 10: case 11: case 12: case 15: case 16: case 18: i += tag===15?3: tag===16?3: tag===18?4:4; pool.push(null); break;
          default: pool.push(null); break;
        }
        idx++;
      }

      zip.file(classFile, bytes);
    }

    const blob = await zip.generateAsync({type:"blob"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = currentFileName.replace(".jar","-mod.jar");
    a.click();
  });
});
