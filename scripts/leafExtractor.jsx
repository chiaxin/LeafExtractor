/* --------------------------------------------------------

    Photoshop Script (JavaScript)
    
    Leaf Extractor 
    
    Usage  : Extract all leaf layer into each directories.
    
    Author : Chia Xin Lin

    Copyright (c) 2019 Chia Xin Lin <nnnight@gmail.com>

    Create date : Jan, 10, 2019 (First build)

    Version : 1.0.0

    Last update : 2019-01-13

    Test and Debug Platform :
    + OS
        + Microsoft Windows 10
    + Photoshop
        + Adobe Photoshop CS6
-----------------------------------------------------------*/

const SCRIPT_NAME = "Leaf Extractor";
const VERSION     = "1.0";

(function leaf_extractor (nogui, debug) {
    var photoshop_version = app.version;
    var version_number = new Number(app.version.substring(0, app.version.indexOf(".")));

    if (version_number >= 13) {
        var save_options = JPEGSaveOptions;
        save_options.quality = 12;
        save_options.alphaChannels = false;
        save_options.embedColorProfile= false;
        save_options.matte = MatteType.SEMIGRAY;
        save_options.scans = FormatOptions.STANDARDBASELINE;
    } else {
        var save_options = PNGSaveOptions;
        nogui = true;
    }

    function Leafs () {}
    Leafs.container = new Array;
    Leafs.states = new Array;
    Leafs.length = 0;

    Leafs.register = function (leaf) {
        // static method : Register a leaf object.
        // param : 
        //      leaf - Leaf object
        // return : Number of leafs.
        if (debug) { 
            $.writeln("Register : " + leaf.name); 
        }
        var current_length = this.container.push(leaf);
        if (debug) {
            $.writeln("Number of layer : " + current_length.toString());
        }
        return current_length;
    };

    Leafs.save_states = function () {
        // static method : Save all leaf's visible.
        // param : none
        // return : Number of visible state.
        for (var idx=0 ; idx<this.container.length ; idx++) {
            this.states.push(this.container[idx].isOn());
        }
        return this.states.length;
    };

    Leafs.hide_all = function () {
        // static method : Hide all leafs.
        // param : none
        // return : Number of leaf has been hidden.
        var counter = 0;
        for (var idx=0 ; idx<this.container.length; idx++) {
            if (this.container[idx].isOn()) {
                this.container[idx].off();
                counter++;
            }
        }
        return counter;
    };

    Leafs.restore = function () {
        // static method : Restore all leaf's visible.
        // param : none
        // return : Number of visible states.
        var states_length = this.states.length;
        for (var idx=0 ; idx<this.container.length ; idx++) {
            if (states_length < idx) { 
                break; 
            }
            if (this.states[idx] === true) {
                this.container[idx].on(0)
            } else {
                this.container[idx].off();
            }
        }
        return states_length;
    };

    Leafs.add = function (layer) {
        // static method : Add a leaf layer.
        // param :
        //      layer : ArtLayer object.
        // return : Leaf object.
        if (!layer instanceof ArtLayer) {
            throw Error(layer.toString() + " is not a ArtLayer!");
        }
        var new_leaf = new Leaf(layer);
        this.register(new_leaf);
        return new_leaf;
    }

    Leafs.collect = function () {
        // static method : Search all leaf layers.
        // param : none
        // return : Number of leaf layers.
        var current_document = app.activeDocument;
        var buffer = new Array;
        for (var idx=0 ; idx<current_document.layerSets.length ; idx++) {
            buffer.push(current_document.layerSets[idx]);
        }
        if (!nogui) {
            var dialog = new Dialog("Analisys...");
        }
        while (buffer.length > 0) {
            var group = buffer.pop();
            if (!nogui) {
                dialog.setinfo("Search : " + group.name);
            }
            for (var idx=0 ; idx<group.layers.length ; idx++) {
                if (group.layers[idx].typename === 'ArtLayer'
                && is_normal_or_smartobj_layer(group.layers[idx])) {
                    this.add(group.layers[idx]);
                } else if (group.layers[idx].typename === 'LayerSet') {
                    buffer.push(group.layers[idx]);
                }
            }
        }
        if (!nogui) {
            dialog.close();
        }
        return this.length;
    }

    function is_normal_or_smartobj_layer (art_layer) {
        // function : Check the layer is normal or smart object layer.
        // param : 
        //      [ArtLayer] : ArtLayer object.
        // return : [Boolean]
        if (art_layer instanceof ArtLayer) {
            return art_layer.kind === LayerKind.NORMAL 
            || art_layer.kind === LayerKind.SMARTOBJECT;
        }
        return false;
    }

    function correct_path_name (path_name) {
        // function : Correct path name did not have \/:"*?<>|
        // param :
        //      [String] path_name
        // return : [String] 
        var buffer = "";
        for (var cid=0 ; cid<path_name.length ; cid++) {
            var chr = path_name.substr(cid, 1);
            switch(chr)
            {
            case "\\":
                buffer += "_";
                break;
            case "/":
                buffer += "_";
                break;
            case ":":
                buffer += "_";
                break;
            case "\"":
                buffer += "_";
                break;
            case "*":
                buffer += "_";
                break;
            case "?":
                buffer += "_";
                break;
            case "<":
                buffer += "_";
                break;
            case ">":
                buffer += "_";
                break;
            case "|":
                buffer += "_";
                break;
            default:
                buffer += chr; 
            }
        }
        return buffer;
    }

    function Leaf (_layer) {
        // object : Leaf layer wrapper.
        // param :
        //      _layer : ArtLayer object.
        // methods :
        //      on()   Set layer to on.
        //      off()  Set layer to off.
        //      isOn() Check layer's visible is on or off.
        function trace (layer, parents) {
            // function : Trace all parent about this layer be a full path.
            // param :
            //      layer : Layer object.
            //      parents : A array that can be store all parents.
            // return : [String] A full path that contain all parent and layer's name.
            var parent = layer.parent;
            var full_path = "";
            while (parent !== app.activeDocument) {
                parents.push(parent);
                full_path = correct_path_name(parent.name) + "/" + full_path;
                parent = parent.parent;
            }
            return full_path + "/" + correct_path_name(layer.name);
        }

        function save_to (file_path) {
            // function : Get a File object from Photoshop layer's hierarchy.
            // param :
            //      file_path : [String] The partial path about layer.
            // return : [File] The File object by full path.
            var current_document = app.activeDocument;
            var last_slash = file_path.lastIndexOf('/');
            var folder = file_path.substr(0, last_slash);
            var save_name = file_path.substring(last_slash, file_path.length + 1) + ".jpg";
            var save_folder = current_document.path + "/" + folder
            return File(save_folder + save_name);
        }
        this.layer = _layer;
        this.parents = new Array;
        this.name  = this.layer.name;
        this.kind  = this.layer.kind;
        this.save_file = save_to(trace(this.layer, this.parents));

        this.on  = function (store_parent) { 
            // method : Show layer and its parents.
            // param:
            //      store_parent : Store parent's visible state.
            // return : [Array] Return all parent's visible states.
            this.layer.visible = true; 
            var states = new Array;
            if (store_parent) {
                for (var pid=0 ; pid<this.parents ; pid++) {
                    states.push(this.parents[pid].visible);
                    this.parent[pid].visible = true;
                }
            }
            return states;
        };

        this.off = function (states) { 
            // Method : Hide layer and restore parent's visible.
            // params :
            //      states : [Array] Parent states.
            // return : [Number] 0 if no any parent have recover. otherwise return 1.
            this.layer.visible = false; 
            if (!states) {
                return 0;
            }
            for (var id=0 ; id<states.length ; id++) {
                if (this.parents.length < id) {
                    break;
                }
                this.parents[id] = states[id];
            }
            return 1;
        };

        this.isOn = function () { 
            // Method : Get layer's visible.
            // params : none
            // return : [Boolean] Layer's visible.
            return this.layer.visible; 
        };
    }

    function extractor () {
        var success_counter = 0;
        try {
            var current_document = app.activeDocument;
        } catch (error) {
            alert("No document could be work!")
            return 0;
        }

        if (current_document.artLayers.length === 0
        ||  !current_document.artLayers[0].isBackgroundLayer) {
            alert("Must have background layer in document!");
            return 0;
        }

        var number_layers = Leafs.collect();
        if (debug) {
            $.writeln(number_layers.toString() + " layer(s) has been found.");
            for (var idx=0 ; idx<Leafs.container.length ; idx++) {
                $.writeln(Leafs.container[idx].name);
            }
        }
        Leafs.save_states();
        var number_of_hidden = Leafs.hide_all();
        if (debug) {
            $.writeln(number_of_hidden.toString() + " layer(s) has been hidden.");
        }
        var dialog = new Dialog("Extract...");
        for (var idx=0 ; idx<Leafs.container.length ; idx++) {
            var layer = Leafs.container[idx];
            dialog.setinfo("Extract : " + layer.name);
            // Create directory if it isn't exists.
            var directory = layer.save_file.parent;
            if (!directory.exists) {
                if (directory.create()) {
                    if (debug) {
                        $.writeln(directory.fsName + " has been created.");
                    }
                } else {
                    if (debug) {
                        $.writeln("Failed to create directory : " + directory.fsName);
                    }
                    continue;
                }
            }
            var parent_states = layer.on();
            try { 
                current_document.saveAs(layer.save_file, save_options, true, Extension.LOWERCASE);
                success_counter++;
            } catch (error) {
                $.writeln(error);
            }
            layer.off(parent_states);
        }
        dialog.setinfo("Ending Process...");
        Leafs.restore();
        dialog.close();
        return success_counter;
    }

    function Dialog (information) {
        const properties = {
            maximizeButton: false,
            minimizeButton: false,
            borderless: false,
            resizeable: false
        };
        this.dialog = new Window(
            "window", SCRIPT_NAME + " v" + VERSION, undefined, properties
        );
        this.dialog.panel = this.dialog.add("panel", undefined);
        this.dialog.panel.size = {width: 240, height: 80};
        this.dialog.active = true;
        this.dialog.panel.alignChild = "center";
        this.dialog.panel.orientation = "column";
        this.dialog.panel.info = this.dialog.panel.add("staticText", undefined);
        this.dialog.panel.info.size = {width:200, height: 24};
        this.dialog.panel.info.text = information;
        this.dialog.show();

        this.setinfo = function (info) {
            this.dialog.panel.info.text = info;
        }

        this.close = function () {
            this.dialog.close(0);
        }
    }

    var result = extractor();
    if (result) {
        alert("There have " + result.toString() + " layer(s) has been extract.");
    }

}) (nogui=false, debug=false);