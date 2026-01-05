document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const filenameSpan = document.getElementById("filename");
  const searchInput = document.getElementById("searchInput");
  const stringList = document.getElementById("stringList");
  const editor = document.getElementById("editor");
  const downloadBtn = document.getElementById("downloadBtn");

  let fileContent = "";
  let stringsArray = [];
  let currentIndex = -1;
  let currentFileName = "";

  // Función para extraer strings de Java
  function extractStrings(content) {
    // Regex para cadenas de texto en Java (entre "")
    const regex = /"(.*?)"/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  function renderStringList(filter="") {
    stringList.innerHTML = "";
    const filtered = filter
      ? stringsArray.filter(s => s.includes(filter))
      : stringsArray;

    filtered.forEach((s,i) => {
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

    const text = await file.text();
    fileContent = text;
    stringsArray = extractStrings(fileContent);
    renderStringList();
    editor.value = "";
  });

  searchInput.addEventListener("input", () => {
    renderStringList(searchInput.value);
  });

  editor.addEventListener("input", () => {
    if (currentIndex < 0) return;
    stringsArray[currentIndex] = editor.value;
  });

  downloadBtn.addEventListener("click", () => {
    if (!fileContent) return alert("No hay archivo cargado");

    // Reemplazar strings en el contenido original
    let modifiedContent = fileContent;
    const regex = /"(.*?)"/g;
    let i = 0;
    modifiedContent = modifiedContent.replace(regex, () => `"${stringsArray[i++]}"`);

    const blob = new Blob([modifiedContent], {type:"text/plain"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = currentFileName || "modificado.java";
    a.click();
  });
});
