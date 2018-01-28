const express = require("express");
const path = require("path");
const fs = require("fs");

const {loadingByChunks, initUploading} = require("./backend/uploadByChank");

const app = express();

app.post("/upload", loadingByChunks);

app.post("/upload/init", initUploading);

app.get("*", function (request, response) {
    const fullPath = request.params[0];

    if (fullPath === "/") {
        response.sendFile(path.join('frontend/', 'index.html'), { root: __dirname });
        return;
    }

    response.sendFile(path.join('frontend/', fullPath), { root: __dirname });
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});