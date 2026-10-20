#target photoshop

app.displayDialogs = DialogModes.NO;

var sourceFile = new File("F:/\u6587\u6863/GitHub/Firefly-master/artwork/kanban-musume/kanban-musume-8k-transparent.png");
var workFile = new File("F:/\u6587\u6863/GitHub/Firefly-master/artwork/kanban-musume/kanban-musume-line-reconstruction-input.png");

if (!sourceFile.exists) {
    throw new Error("Source image not found: " + sourceFile.fsName);
}

var doc = app.open(sourceFile);
doc.resizeImage(UnitValue(2560, "px"), UnitValue(3840, "px"), 300, ResampleMethod.BICUBICSHARPER);

var pngOptions = new PNGSaveOptions();
pngOptions.compression = 6;
pngOptions.interlaced = false;
doc.saveAs(workFile, pngOptions, true, Extension.LOWERCASE);
doc.close(SaveOptions.DONOTSAVECHANGES);

"WORK=" + workFile.fsName;
