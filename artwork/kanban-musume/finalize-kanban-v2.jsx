#target photoshop

app.displayDialogs = DialogModes.NO;

var psdFile = new File("F:/\u6587\u6863/GitHub/Firefly-master/artwork/kanban-musume/kanban-musume-v2-8k-layered.psd");
var pngFile = new File("F:/\u6587\u6863/GitHub/Firefly-master/artwork/kanban-musume/kanban-musume-v2-8k-transparent.png");

if (!psdFile.exists) {
    throw new Error("Layered PSD not found: " + psdFile.fsName);
}

var doc = null;
for (var openIndex = 0; openIndex < app.documents.length; openIndex++) {
    if (app.documents[openIndex].name == psdFile.name) {
        doc = app.documents[openIndex];
        break;
    }
}
if (doc == null) {
    doc = app.open(psdFile);
}
app.activeDocument = doc;
for (var i = doc.layers.length - 1; i >= 0; i--) {
    var layer = doc.layers[i];
    if (layer.name == "01_Base_Character_SmartObject") {
        layer.visible = true;
    } else {
        if (layer.name.indexOf("Optional") < 0) {
            layer.name += " (Optional, Hidden)";
        }
        layer.visible = false;
    }
}

var psdOptions = new PhotoshopSaveOptions();
psdOptions.layers = true;
psdOptions.alphaChannels = true;
psdOptions.embedColorProfile = true;
psdOptions.maximizeCompatibility = true;
doc.saveAs(psdFile, psdOptions, true, Extension.LOWERCASE);

var pngOptions = new PNGSaveOptions();
pngOptions.compression = 6;
pngOptions.interlaced = false;
doc.saveAs(pngFile, pngOptions, true, Extension.LOWERCASE);

var report = [];
for (var j = 0; j < doc.layers.length; j++) {
    report.push(doc.layers[j].name + ": visible=" + doc.layers[j].visible);
}
report.join("\n");
