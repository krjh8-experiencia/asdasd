async function upload() {
    const fd = new FormData();
    fd.append("jar", document.getElementById("jar").files[0]);
    await fetch("/upload", { method:"POST", body:fd });
    loadTree();
}

async function loadTree() {
    const tree = await fetch("/tree").then(r=>r.json());
    document.getElementById("tree").innerHTML = render(tree, "");
}

function render(nodes, base) {
    return "<ul>" + nodes.map(n => {
        const path = base + "/" + n.name;
        return n.children
            ? `<li onclick="this.classList.toggle('c')">${n.name}${render(n.children,path)}</li>`
            : `<li onclick="openFile('${path}')">${n.name}</li>`;
    }).join("") + "</ul>";
}

async function openFile(path) {
    const txt = await fetch(`/file?path=${path}`).then(r=>r.text());
    editor.value = txt;
    editor.dataset.path = path;
}

editor.oninput = () => {
    fetch("/save", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
            path: editor.dataset.path,
            content: editor.value
        })
    });
};
