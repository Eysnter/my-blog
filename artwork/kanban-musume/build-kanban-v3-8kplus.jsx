#target photoshop

app.displayDialogs = DialogModes.NO;

var sourceFile = new File("F:/\u56fe\u7247/\u7231\u4e1d\u7279\u770b\u677f\u5a18/\u7231\u4e1d\u7279\u770b\u677f\u5a18-\u8d85\u7cbe\u7ec6\u91cd\u7ed8-v3-4x\u52a8\u6f2b\u8d85\u5206.png");
var psdFile = new File("F:/\u56fe\u7247/\u7231\u4e1d\u7279\u770b\u677f\u5a18/\u7231\u4e1d\u7279\u770b\u677f\u5a18-\u8d85\u7cbe\u7ec6\u91cd\u7ed8-v3-8Kplus-\u5206\u5c42.psd");
var pngFile = new File("F:/\u56fe\u7247/\u7231\u4e1d\u7279\u770b\u677f\u5a18/\u7231\u4e1d\u7279\u770b\u677f\u5a18-\u8d85\u7cbe\u7ec6\u91cd\u7ed8-v3-8Kplus-8192x12288.png");

if (!sourceFile.exists) {
    throw new Error("Upscaled source image not found: " + sourceFile.fsName);
}

function convertActiveLayerToSmartObject() {
    executeAction(stringIDToTypeID("newPlacedLayer"), undefined, DialogModes.NO);
}

var doc = app.open(sourceFile);
doc.activeLayer.name = "01_Redrawn_4x_ESRGAN_Master_SmartObject";
convertActiveLayerToSmartObject();
doc.activeLayer.name = "01_Redrawn_4x_ESRGAN_Master_SmartObject";
var base = doc.activeLayer;

try {
    doc.resizeImage(UnitValue(8192, "px"), UnitValue(12288, "px"), 300, ResampleMethod.PRESERVEDETAILS);
} catch (resizeError) {
    doc.resizeImage(UnitValue(8192, "px"), UnitValue(12288, "px"), 300, ResampleMethod.BICUBICSHARPER);
}

var detail = base.duplicate();
detail.name = "02_Microdetail_Line_and_Fabric_Enhancement";
doc.activeLayer = detail;
try {
    detail.applyHighPass(1.4);
    detail.blendMode = BlendMode.OVERLAY;
    detail.opacity = 20;
} catch (filterError) {
    detail.visible = false;
    detail.name += " (Optional, Hidden)";
}

var psdOptions = new PhotoshopSaveOptions();
psdOptions.layers = true;
psdOptions.alphaChannels = true;
psdOptions.annotations = true;
psdOptions.embedColorProfile = true;
psdOptions.maximizeCompatibility = true;
doc.saveAs(psdFile, psdOptions, true, Extension.LOWERCASE);

var pngOptions = new PNGSaveOptions();
pngOptions.compression = 6;
pngOptions.interlaced = false;
doc.saveAs(pngFile, pngOptions, true, Extension.LOWERCASE);

doc.close(SaveOptions.DONOTSAVECHANGES);

var verify = app.open(psdFile);
var layers = [];
for (var i = 0; i < verify.layers.length; i++) {
    layers.push(verify.layers[i].name + ": kind=" + verify.layers[i].kind + ", visible=" + verify.layers[i].visible);
}
[
    "PSD=" + psdFile.fsName,
    "PNG=" + pngFile.fsName,
    "SIZE=" + verify.width.as("px") + "x" + verify.height.as("px"),
    "RESOLUTION=" + verify.resolution,
    "LAYERS=" + layers.join(" | ")
].join("\n");
