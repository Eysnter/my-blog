#target photoshop

app.displayDialogs = DialogModes.NO;

var sourceFile = new File("F:/\u56fe\u7247/\u7231\u4e1d\u7279\u770b\u677f\u5a18/\u7c89\u767d\u5154\u7cfb\u68a6\u5883\u5c11\u5973.png");
var generatedFile = new File("F:/\u6587\u6863/GitHub/Firefly-master/artwork/kanban-musume/kanban-musume-v2-source.png");
var psdFile = new File("F:/\u6587\u6863/GitHub/Firefly-master/artwork/kanban-musume/kanban-musume-v2-8k-layered.psd");
var pngFile = new File("F:/\u6587\u6863/GitHub/Firefly-master/artwork/kanban-musume/kanban-musume-v2-8k-transparent.png");

if (!generatedFile.exists) {
    throw new Error("Generated source image not found: " + generatedFile.fsName);
}

function convertActiveLayerToSmartObject() {
    executeAction(stringIDToTypeID("newPlacedLayer"), undefined, DialogModes.NO);
}

function addClippedPinkGrade(doc) {
    var grade = doc.artLayers.add();
    grade.name = "03_Pink_Color_Grade";
    doc.activeLayer = grade;

    var pink = new SolidColor();
    pink.rgb.red = 255;
    pink.rgb.green = 183;
    pink.rgb.blue = 209;

    doc.selection.selectAll();
    doc.selection.fill(pink, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();

    grade.blendMode = BlendMode.SOFTLIGHT;
    grade.opacity = 12;
    grade.grouped = true;
    return grade;
}

function saveLayeredPsd(doc, file) {
    var psdOptions = new PhotoshopSaveOptions();
    psdOptions.layers = true;
    psdOptions.alphaChannels = true;
    psdOptions.annotations = true;
    psdOptions.embedColorProfile = true;
    psdOptions.maximizeCompatibility = true;
    doc.saveAs(file, psdOptions, true, Extension.LOWERCASE);
}

function saveTransparentPng(doc, file) {
    var pngOptions = new PNGSaveOptions();
    pngOptions.compression = 6;
    pngOptions.interlaced = false;
    doc.saveAs(file, pngOptions, true, Extension.LOWERCASE);
}

var doc = app.open(generatedFile);
doc.name;

try {
    doc.resizeImage(UnitValue(5120, "px"), UnitValue(7680, "px"), 300, ResampleMethod.PRESERVEDETAILS);
} catch (resizeError) {
    doc.resizeImage(UnitValue(5120, "px"), UnitValue(7680, "px"), 300, ResampleMethod.BICUBICSHARPER);
}

doc.activeLayer.name = "01_Base_Character_SmartObject";
convertActiveLayerToSmartObject();
doc.activeLayer.name = "01_Base_Character_SmartObject";
var base = doc.activeLayer;

var crisp = base.duplicate();
crisp.name = "02_Crisp_Line_Enhancement";
doc.activeLayer = crisp;
try {
    crisp.applyHighPass(2.2);
    crisp.blendMode = BlendMode.OVERLAY;
    crisp.opacity = 38;
} catch (filterError) {
    crisp.opacity = 28;
}

addClippedPinkGrade(doc);

var glow = base.duplicate();
glow.name = "04_Soft_Pearl_Glow";
doc.activeLayer = glow;
try {
    glow.applyGaussianBlur(5.5);
    glow.blendMode = BlendMode.SCREEN;
    glow.opacity = 13;
} catch (glowError) {
    glow.opacity = 10;
}

saveLayeredPsd(doc, psdFile);
saveTransparentPng(doc, pngFile);
doc.close(SaveOptions.DONOTSAVECHANGES);

var verifyDoc = app.open(psdFile);
var names = [];
for (var i = 0; i < verifyDoc.layers.length; i++) {
    names.push(verifyDoc.layers[i].name);
}
var report = [
    "PSD=" + psdFile.fsName,
    "PNG=" + pngFile.fsName,
    "SIZE=" + verifyDoc.width.as("px") + "x" + verifyDoc.height.as("px"),
    "RESOLUTION=" + verifyDoc.resolution,
    "LAYERS=" + names.join(" | ")
].join("\n");

report;
