const fs = require("fs");
const crypto = require("crypto");

const fileStorage = {};

function UploadedFile(name, size, chunksQuantity) {
    this.contentSizes = [];
    this.chunks = [];
    this.name = name;
    this.size = size;
    this.chunksQuantity = chunksQuantity;
    this.chunksDone = 0;
}

UploadedFile.prototype.getChunkLength = function (id) {
    if (!this.chunks[id]) {
        return 0;
    }

    return this.chunks[id].length;
};

UploadedFile.prototype.pushChunk = function(id, chunk, contentLength) {
    const completeChunk = Buffer.concat(chunk);

    if (completeChunk.length !== contentLength) {
        return false;
    }

    this.chunks[id] = completeChunk;
    this.chunksDone += 1;

    return true;
};

UploadedFile.prototype.isCompleted = function() {
    return this.chunksQuantity === this.chunksDone;
};

UploadedFile.prototype.getContent = function () {
    return Buffer.concat(this.chunks);
};

function initUploading(request, response) {
    if (!"x-content-name" in request.headers) {
        sendBadRequest(response, "Can't initialize file uploading: request has no content name header");
        return;
    }

    if (!"x-content-length" in request.headers) {
        sendBadRequest(response, "Can't initialize file uploading: request has no content length header");
        return;
    }

    if (!"x-chunks-quantity" in request.headers) {
        sendBadRequest(response, "Can't initialize file uploading: request has no chunks quantity header");
        return;
    }

    const name = request.headers["x-content-name"];
    const size = Number(request.headers["x-content-length"]);
    const chunksQuantity = Number(request.headers["x-chunks-quantity"]);
    const fileId = crypto.randomBytes(128).toString("hex");

    fileStorage[fileId] = new UploadedFile(name, size, chunksQuantity);

    response.write(JSON.stringify({
        status: 200,
        fileId
    }));
    response.end();
}

function loadingByChunks(request, response) {
    if (!"x-content-id" in request.headers) {
        sendBadRequest(response, "Request has no content id header");
        return;
    }

    if (!"x-chunk-id" in request.headers) {
        sendBadRequest(response, "Request has no chunk id header");
        return;
    }

    const fileId = request.headers["x-content-id"];
    const chunkId = request.headers["x-chunk-id"];
    const chunkSize = Number(request.headers["content-length"]);
    const file = fileStorage[fileId];
    const chunk = [];

    if (!file) {
        sendBadRequest(response, "Wrong content id header");
        return;
    }

    request.on("data", (part) => {
        chunk.push(part);
    }).on("end", () => {
        const chunkComplete = file.pushChunk(chunkId, chunk, chunkSize);

        if (!chunkComplete) {
            sendBadRequest(response, "Chunk uploading was not completed");
            return;
        }

        const size = file.getChunkLength(chunkId);

        if (file.isCompleted()) {
            const fstream = fs.createWriteStream(__dirname + '/../files/' + file.name);

            fstream.write(file.getContent());
            fstream.end();

            delete fileStorage[fileId];
        }

        response.setHeader("Content-Type", "application/json");
        response.write(JSON.stringify({
            status: 200,
            size
        }));
        response.end();
    });
}

function sendBadRequest(response, error) {
    response.write(JSON.stringify({
        status: 400,
        error
    }));
    response.end();
}

exports.loadingByChunks = loadingByChunks;
exports.initUploading = initUploading;