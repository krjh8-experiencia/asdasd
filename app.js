document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const filenameSpan = document.getElementById("filename");
  const stringList = document.getElementById("stringList");
  const editor = document.getElementById("editor");
  const downloadBtn = document.getElementById("downloadBtn");

  let zip = null;
  let javaFiles = [];
  let currentFileName = "";
  let currentStrings = [];
  let currentIndex = -1;

  function extractStrings(content) {
    const regex = /"(.*?)"/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  function renderStringList() {
    stringList.innerHTML = "";
    currentStrings.forEach((s,i) => {
      const div = document.createElement("div");
      div.className = "stringItem";
      div.textContent = s;
      div.onclick = () => {
        currentIndex = i;
        editor.value = s;
      };
      stringList.appendChild(div);
    });
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    currentFileName = file.name;
    filenameSpan.textContent = file.name;

    zip = await JSZip.loadAsync(file);

    // Buscar todos los archivos .java
    javaFiles = [];
    zip.forEach((relativePath, fileObj) => {
      if (relativePath.endsWith(".java")) {
        javaFiles.push(relativePath);
      }
    });

    if (javaFiles.length === 0) {
      alert("No se encontraron archivos .java en el JAR");
      return;
    }

    // Abrir el primer .java automáticamente
    const firstJava = javaFiles[0];
    const text = await zip.file(firstJava).async("string");
    currentStrings = extractStrings(text);
    renderStringList();
  });

  editor.addEventListener("input", () => {
    if (currentIndex < 0) return;
    currentStrings[currentIndex] = editor.value;
  });

  downloadBtn.addEventListener("click", async () => {
    if (!zip) return alert("No hay archivo cargado");

    for (let javaFile of javaFiles) {
      let content = await zip.file(javaFile).async("string");
      let i = 0;
      content = content.replace(/"(.*?)"/g, () => `"${currentStrings[i++] || ''}"`);
      zip.file(javaFile, content);
    }

    const blob = await zip.generateAsync({type:"blob"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = currentFileName.replace(".jar","-mod.jar");
    a.click();
  });
});
