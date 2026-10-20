#target photoshop

app.displayDialogs = DialogModes.NO;

var sourceFile = new File("F:/\u6587\u6863/GitHub/Firefly-master/artwork/kanban-musume/kanban-musume-8k-transparent.png");
var psdFile = new File("F:/\u6587\u6863/GitHub/Firefly-master/artwork/kanban-musume/kanban-musume-8k-line-enhanced.psd");
var pngFile = new File("F:/\u6587\u6863/GitHub/Firefly-master/artwork/kanban-musume/kanban-musume-8k-line-enhanced.png");

if (!sourceFile.exists) {
    throw new Error("Source image not found: " + sourceFile.fsName);
}

function convertActiveLayerToSmartObject() {
    executeAction(stringIDToTypeID("newPlacedLayer"), undefined, DialogModes.NO);
}

var doc = app.open(sourceFile);
doc.activeLayer.name = "01_Original_Character_SmartObject";
convertActiveLayerToSmartObject();
doc.activeLayer.name = "01_Original_Character_SmartObject";
var base = doc.activeLayer;

var micro = base.duplicate();
micro.name = "02_Microcontrast_Line_Definition";
doc.activeLayer = micro;
micro.applyHighPass(1.6);
micro.blendMode = BlendMode.OVERLAY;
micro.opacity = 28;

var clarity = base.duplicate();
clarity.name = "03_Subtle_Edge_Clarity";
doc.activeLayer = clarity;
clarity.applyUnSharpMask(65, 0.8, 2);
clarity.blendMode = BlendMode.LUMINOSITY;
clarity.opacity = 35;

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

doc.close(SaveOptions.DONOTSAVECHANGES);
var verify = app.open(psdFile);
var report = [];
for (var i = 0; i < verify.layers.length; i++) {
    report.push(verify.layers[i].name + ": kind=" + verify.layers[i].kind + ", visible=" + verify.layers[i].visible);
}
[
    "PSD=" + psdFile.fsName,
    "PNG=" + pngFile.fsName,
    "SIZE=" + verify.width.as("px") + "x" + verify.height.as("px"),
    "LAYERS=" + report.join(" | ")
].join("\n");
