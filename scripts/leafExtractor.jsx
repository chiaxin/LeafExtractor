/* ---

    Author : Chia Xin Lin

   --- */

(function leaf_extractor () {
    // JPEG save options
    var save_options = JPEGSaveOptions;
    save_options.quality = 12;
    save_options.alphaChannels = false;
    save_options.embedColorProfile= false;
    save_options.matte = MatteType.SEMIGRAY;
    save_options.scans = FormatOptions.STANDARDBASELINE;

    function Leafs () {}

    Leafs.container = new Array;
    Leafs.register = function (leaf) {
        this.container.push(leaf);
    };
    Leafs.save_visible = function () {
        this.visibilies = new Array;
        for (var i=0 ; i<this.container.length ; i++) {
            this.visibilies.push(this.container[i].isOn());
        }
    };
    Leafs.hide_all = function () {
        for (var idx=0 ; idx<this.container.length; idx++) {
            this.container[idx].off();
        }
    };
    Leafs.restore = function () {
        if (!"visibilies" in this) {
            this.visibilies = new Array(length=this.container.length, element=true);
        }
        for (var i=0 ; i<this.container.length ; i++) {
            if (this.container[i].isOn() === true) {
                this.container[i].on();
            } else {
                this.container[i].off();
            }
        }
    };

    // Leaf is a wrapper for layer, it could be control layer's behaviors.
    function Leaf (_layer) {
        this.layer = _layer;
        this.name  = this.layer.name;
        this.save_path = save_to(trace(this.layer));
        // this.save_path = _save_path;
        this.on  = function () { this.layer.visible = true; };
        this.off = function () { this.layer.visible = false; };
        this.isOn = function () { return this.layer.visible; };
    }
   
    //
    function trace (layer) {
        var parent = layer.parent;
        var full_path = "";
        while (parent !== app.activeDocument) {
            full_path = parent.name + "/" + full_path;
            parent = parent.parent;
        }
        return full_path + "/" + layer.name;
    }

    function save_to (file_path) {
        var current_document = app.activeDocument;
        var last_slash = file_path.lastIndexOf('/');
        var folder = file_path.substr(0, last_slash);
        var save_name = file_path.substring(last_slash, file_path.length + 1) + ".jpg";
        var save_folder = current_document.path + "/" + folder
        return  File(save_folder+ save_name).fsName;
    }

    //
    function includes (value, array) {
        for (var i=0 ; i<array.length ; i++) {
            if (value === array[i]) {
                return true;
            }
        }
        return false;
    }

    //
    function push_all (main_array, source_array) {
        for (var i=0 ; i<source_array.length ; i++) {
            main_array.push(source_array[i]);
        }
    }

    //
    function hide_all (leafs) {
        var store = new Array;
        for (var i=0 ; i<leafs.length ; i++) {
            store.push(leafs[i].isOn());
            leafs[i].off();
        }
        return store;
    }

    //
    function recover_all (leafs, visibilies) {
        for (var i=0 ; i<leafs.length ; i++) {
            if (visibilies[i]) {
                leafs[i].on();
            } else {
                leafs[i].off();
            }
        }
        return visibilies;
    }

    //
    function get_leaf_layers (root) {
        var kinds = new Array(LayerKind.SMARTOBJECT, LayerKind.NORMAL);
        var results = new Array;
        var buffer = new Array(root);
        while (buffer.length > 0) {
            var group = buffer.pop();
            for (var i=0 ; i<group.layers.length ; i++) {
                if (group.layers[i].typename === 'ArtLayer'
                && includes(group.layers[i].kind, kinds)) {
                    results.push(group.layers[i]);
                } else if (group.layers[i].typename === 'LayerSet') {
                    buffer.push(group.layers[i]);
                }
            }
        }
        return results;
    }

    //

    //
    function extractor () {
        var current_document = app.activeDocument;
        var groups = current_document.layerSets;
        var layers = new Array;
        for (var i=0 ; i<groups.length ; i++) {
            try {
                push_all(layers, get_leaf_layers(groups[i]));
            } catch (e) {
                $.write(e);
                return;
            }
        }
        /*
        var leafs = new Array;
        for (var id=0 ; id<layers.length ; id++) {
            leafs.push(new Leaf(layers[id])); 
        }
        */
        for (var id=0 ; id<layers.length ; id++) {
            Leafs.register(new Leaf(layers[id]));
        }
        // var visibilies = hide_all(leafs);
        Leafs.hide_all();
        for (var i=0 ; i<Leafs.container.length ; i++) {
            var layer = Leafs.container[i];
            $.write("Extract : " + layer.name + " : " + layer.save_path + "\n");
            var save_image = new File(layer.save_path);
            var directory = new Folder(save_image.path);
            if (!directory.exists) {
                var status = directory.create();
                if (status) {
                    $.write(directory.fsName + " has been create\n");
                } else {
                    $.write("Failed to ceate folder : " + directory.fsName + "\n");
                    continue;
                }
            }
            layer.on();
            try {
                current_document.saveAs(
                    save_image, 
                    save_options, 
                    true, 
                    Extension.LOWERCASE
                );
                layer.off();
            } catch (e) {
                $.write(e);
            }
        }
        Leafs.restore();
    }

    extractor();
}) ();