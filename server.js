const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { exec } = require("child_process");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("jar"), (req, res) => {
    const jarPath = req.file.path;
    const outDir = "decompiled";

    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir);

    exec(`java -jar cfr.jar ${jarPath} --outputdir ${outDir}`, err => {
        if (err) return res.status(500).send("Error decompilando");
        res.send({ success: true });
    });
});

app.get("/tree", (req, res) => {
    function walk(dir) {
        return fs.readdirSync(dir).map(name => {
            const path = `${dir}/${name}`;
            return fs.statSync(path).isDirectory()
                ? { name, children: walk(path) }
                : { name };
        });
    }
    res.json(walk("decompiled"));
});

app.get("/file", (req, res) => {
    res.send(fs.readFileSync(req.query.path, "utf8"));
});

app.post("/save", (req, res) => {
    fs.writeFileSync(req.body.path, req.body.content);
    res.send({ ok: true });
});

app.listen(3000, () =>
    console.log("Servidor en http://localhost:3000")
);
