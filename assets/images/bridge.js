// Bridge implementation for QWebEngine version
// initializing webengine bridge
// after load qwebchannel.js and qwebchannel.registerObject("OBJECTNAME",&bridge);
//      need initialize bridge data
// bridge will be shared in channel.objects.OBJECTNAME

// !!!!!!!! unable to work with it
if (!window._Bridge_){
	new QWebChannel(qt.webChannelTransport, function(channel) {
        window._Bridge_ = channel.objects.bridge;
		
        _Bridge_.onClose.connect(function(){
            if (Bridge.emit) // emit created with quit() binding
				Bridge.emit("close");
			else
				Bridge.quit();
        });
		
		_Bridge_.onDropFiles.connect(function(jsonFiles){
			Bridge.emit("drop", eval(jsonFiles));
			if (Bridge.onDrop) Bridge.onDrop(eval(jsonFiles))
		})
   });
}


(function(){

	// prevent dublicated write
	if (window.Bridge && window.Bridge._level0)
		return;
	

	// init Bridge level0 
	var Bridge0 = 
	{
		_level0: true, // bridge level0

		appName:"@APP_NAME@",
		version:"@APP_VER@",
		dataLocation:"@DATA_LOCATION@",
        tempLocation : "@TEMP_LOCATION@",
        docLocation :"@DOC_LOCATION@",
		isPro: ("@PRO@"=="true"),
		isDev: ("@DEV@"=="true"),
		supportedImgExts: ["jpg","jpeg","png","gif","bmp","tiff","svg","ico"], // dublicated in extbridge
		getArgs: function(callback_args){
			if (callback_args)
				callback_args(_Bridge_.getArgs());
		},

		// Bridge.onDrop = function(files){ for (var i=0; i<files.length; i++) console.log("drop:" + files[i]) }
		onDrop: 0,
		onClose: 0,

		// ex: Bridge.getRecents().split("\n")[0]
		getRecents: function(callback){
			// QString response
			console.log('get recents')
			_Bridge_.getRecents(function(response){
				callback(response);
			});
		},

		// Bridge.templating(filePath) > return templating file
		templating : function(filePath) {
		   return filePath
		 },

		// String caption, String dir, String filter
		// Bridge.runFileDialog("Select file for export", "c:/index.html", "HTML pages (*.html *.htm)", function(path){console.log(path);}) > return "c:/index.html"
		// @callback = function(path)
		// return - path to file or array of files
		runFileDialog: function(caption, dir, filter, callback,multi){
			_Bridge_.openFileDialog(caption,dir,filter,!!multi,function(path){
				if (multi && path)
					path = JSON.parse(path);
				if(callback) callback(path);
			});
		},


		// save file to local drive
		// avoid to save/load large data
		// ex: Bridge.saveLocalFile(Bridge.getRecents().split("\n")[0].split("///")[1]+"/project.json", data)
		saveLocalFile: function(path, data, callback_ok){
			_Bridge_.saveLocalFile(path, data, function(ok){
				if (callback_ok) callback_ok(ok);
			});
		},

		// load file from disk (or resource)
		// ex: var data = Bridge.loadLocalFile(Bridge.getRecents().split("\n")[0].split("///")[1]+"/project.json")
		loadLocalFile: function(path,callback){
		   // return file data
		   _Bridge_.loadLocalFile(path,function(response){
			   callback(response);
		   });

		},
		
		copyLocal: function(src, dest, callback_newpath){
			_Bridge_.copyLocal(src, dest, function(newpath){
				if (callback_newpath) callback_newpath(newpath);
		    });
		},
		
		removeLocal: function(url, callback_ok){
			_Bridge_.removeLocal(url, function(ok){
				if (callback_ok) callback_ok(ok);	
			});
		},
		
		isExistsLocal: function(url, callback_ok){
			_Bridge_.isExistsLocal(url, function(ok){
				if (callback_ok) callback_ok(ok);	
			});
		}, 

		/** dir list
		 * @param url
		 * @param callback_list {String[]}
		 * @param options {Object}
		 * @param options.names {String[]} - default ["*"]
		 * @param options.filter {Integer} - |1 - files(default) |2 - dirs |3 - all
		 * @param options.recursive {bool} - default true
		 */
		dirList: function(url, callback_list, options){
			if (!url) {
				callback_list([]);
				return;
			}

			options = options || {};
			_Bridge_.dirList( url, (options.names||["*"]).join(";"), options.filter ||1, ("recursive" in options? options.recursive: true), function(list){
				list = list? (""+list).split("\n"): [];
				if (callback_list) callback_list(list);
			} );
		},

		moveLocal: function(src, dest, callback_ok){
			_Bridge_.moveLocal(src, dest, function(ok){
				if (callback_ok) callback_ok(ok);
			});
		},
		
		loadLocalBase64: function(path,callback){
		   // return file data
		   _Bridge_.loadLocalBase64(path,function(response){
			   callback(response);
		   });

		},
	
		saveLocalBase64: function(path, data, callback_ok){
			_Bridge_.saveLocalBase64(path, data, function(ok){
				if (callback_ok) callback_ok(ok);
			});
		},
		
		md5_base64: function(url, callback_md5){
			var md5 = _Bridge_.md5_base64(url, function(md5){
				if (callback_md5) callback_md5(md5);
			});
		},

		// @depricated use loadLocalFile instead
		// get project file from destanition folder
		// @url - folder url as in resent list
		// ex: Bridge.getProject(Bridge.getRecents().split("\n")[0]+"/project.json")
		getProject: function(url,callback){
			// response - return project file data
			_Bridge_.getProjectFile(url,function(response){
				callback(response);
			});
		},
		getResourceFile : function(data,callback)
		{
			_Bridge_.getResourceFile(data,function(response){
				callback(response)
			});
		},

		/**
		 *  Upload files (in list) to supported destanition
		 *  @type FileManaderUploader
		 *  @see Bridge.FileManaderUploader
		 */
        uploadBuildIn: function(url, list, options){
			var SUPPORTED = "file|ftp|ftps|sftps".split("|");
			if (!list && !url) return SUPPORTED; // supported protocols
			if (SUPPORTED.indexOf(url.split(":")[0])<0) // unsupported protocols
				return;
			
			// prevent dual start
			if (Bridge._uploadInstance){
				console.log("Error: dual start prevented");
				return; 
			}
			
			var stoped = false; // file-queue loop control ????????????
			
			var instance = Bridge._uploadInstance = {
				emit: function(name, arg){
					try{ 
						this[name](arg);
					} catch(e){}
				},
				// exit : break publish
				exit: function(){ 
					stoped = true;
					_Bridge_.exitPublish();
				},
				// continue publish(do nothing if publish has not been stopped)
				resume : function(){ 
					_Bridge_.resumePublish();
				},
				// pause publish process(do nothing if publish already stopped)
				pause : function(){ 
					_Bridge_.pausePublish();
				},
				
				onStart: options.onStart ||function(count){},
				onFile : options.onFile  ||function(file){},
				onUploaded: options.onUploaded ||function(file){},
				onError: options.onError ||function(error){},
				onClose: options.onClose ||function(){destUrl},
				onData: options.onData ||function(path){return ""}
			};
			
			instance.emit("onStart", list.length);
			
			setTimeout(function(){ // true async start
			
				_Bridge_.initFileManager(url);

				for ( var desti=0; desti<list.length; desti++ ){
					if (stoped) return;
					
					var dest = list[desti];
					if (!dest.srcList) continue;
					var destPath = dest.dest;

					// if file include only 1 file
					if(dest.srcList.length === 1)
					{
						var src = dest.srcList[0];
						var srcPath = src.src;
						if (!src.filter){
							_Bridge_.uploadFile(destPath, srcPath);
						}
						else{
							_Bridge_.uploadData(destPath, instance.onData(srcPath, src.filter));
						}
					// if file include more than 1 file
					}
					else
					{
						// initialize temp, write to temp,upload and remove
						_Bridge_.initTempFile();
						for (var srci=0; srci<dest.srcList.length; srci++){
							var src = dest.srcList[srci];
							var srcPath = src.src;

							if(!src.filter){
								_Bridge_.tmpAppendFile(srcPath)
							}
							else{
								_Bridge_.tmpAppendData(instance.onData(srcPath, src.filter));
							}
						}

						_Bridge_.uploadTempFile(destPath);
						_Bridge_.closeTempFile();

					}
				}

				_Bridge_.closeFileManager(); // queued and emited _fmClose				

			},0);

            return instance;
        },

		 /**
		  * @type FileManaderUploaderInstance
		  */
		_uploadInstance: false, // _Bridge_ save manager instance

		// file was uploaded (if no error)
		_fmUploaded: function(file){
			if (Bridge._uploadInstance)
				Bridge._uploadInstance.emit("onUploaded", file);
		},
		
		// ready geted data in base64 (if no error raised)
		_fmFileReady: function(data64){
			console.log(_fmFileReady, data64);
		},
		
		// this function alled from QT as callback events
		_fmFile: function(file){
			if (Bridge._uploadInstance)
				Bridge._uploadInstance.emit("onFile", file);
		},
		_fmClose: function(destUrl){ 
			if (Bridge._uploadInstance) {
				Bridge._uploadInstance.emit("onClose", destUrl);
				Bridge._uploadInstance = false;
			}
		},
		_fmError: function(error){
			if (Bridge._uploadInstance) 
				Bridge._uploadInstance.emit("onError", error);
		},
		
		// deprecated!!!
		// exit : break publish
		exitPublish : function(){ 
			if (Bridge._uploadInstance) 
				Bridge._uploadInstance.exit();
		},
		// deprecated!!!
		// continue publish(do nothing if publish has not been stopped)
		resumePublish : function(){ 
			if (Bridge._uploadInstance) 
				Bridge._uploadInstance.resume();
		},
		// deprecated!!!
		// pause publish process(do nothing if publish already stopped)
		pausePublish : function(){ 
			if (Bridge._uploadInstance) 
				Bridge._uploadInstance.pause();
		},

		/**
		 * select images with runFileDialog, and resize with transformImage 
		 * @param {String} caption
		 * @param {String} dir -start dir
		 * @param {Object} options - resize options, see transformImage 
		 * @param {Function} callback_path - function(path){} - result path
		 */
		runImgFileDialog: function(caption, dir, options, callback){
			// default options for resize
			var DEFAULTS = {
				width: -1,
				height: -1,
				keepAspectRatio: true,
				quality: 100,
				format: ""
			};
			// extend custom user parameters
			for(var k in DEFAULTS) {
				if(typeof options[k] === 'undefined') {
					options[k] = DEFAULTS[k];
				}
			}
			var mask = "Images (*." + Bridge.supportedImgExts.join(" *.") + ")";
			Bridge.runFileDialog(caption,dir,mask, function(path){
				if (!path) {// path - return file to image was been resized
					if (callback) callback(path);
					return; 
				}
				if (!/(gif|svg)$/.test(path)) // do not resize animated and vector images
				{
					Bridge.transformImage(path, options, callback);
				}
				else 
					callback ( path );
			});
		},
		
		// resize image from src , to setted size , with various quality(1-100) and format
		// ex : Bridge.resizeImage("E:/hoho.jpg",100,100,true,100,"jpg");
		// String src , int width , int height , bool keepAspectRatio , int quality , string format
		resizeImage: function(src ,width,height,keepAspectRatio,quality , format , callback ){
			_Bridge_.resizeImage(src,width,height,keepAspectRatio,quality,format,function(response){
				if (callback) callback(response);
			});

		},

		transformImage: function(src, options, callback){
			options = options||{};
			var DEFAULTS = {
				width: -1,
				height: -1,
				keepAspectRatio: true,
				shrinkLarge: false,
				stretchSmall: false,
				quality: (/png$/.test(options.format||src)? 1: 100), // quality preset - max compress for png and min for jpg
				format: "",
				fillColor: "" // fillColor
			}

			// extend custom user parameters
			for(var k in DEFAULTS) {
				if(typeof options[k] === 'undefined') {
					options[k] = DEFAULTS[k];
				}
			}

    		_Bridge_.scaleImage(src, options.width||-1, options.height||-1,
                options.shrinkLarge, options.stretchSmall, options.keepAspectRatio,
                options.fillColor||"", options.quality||DEFAULTS.quality, options.format||"",
                function(response){ if (callback) callback(response); }
			);
		},

		getScreen : function(callback_path, path, size, rect){
			path = path || Bridge.tempLocation + "/screen" + Bridge.dateFormat(new Date(),"yyyyMMdd_hhmmss") + ".png";
			size = size || [];
			rect = rect || [];
			Bridge._screenResult = callback_path;
			console.log(["_Bridge_.getScreen(", path, size[0]||0, size[1]||0, rect[0]||0, rect[1]||0, rect[2]||0, rect[3]||0])
			_Bridge_.getScreen(path, size[0]||0, size[1]||0, rect[0]||0, rect[1]||0, rect[2]||0, rect[3]||0);
		},
		_screenResult: 0,
		_screenReady : function(path){
			console.log("_screenReady("+path+")");
			if (Bridge._screenResult)
			{
				Bridge._screenResult(path);
				Bridge._screenResult = 0;
			}
		},
		
		// return bridge state
		isValid : function(){
			if(window._Bridge_ !== undefined)
				return true;
			else
				return false;
		},

		regExportData : function(callback){
			_Bridge_.regExportData(function(response){
				callback(response);
			});
		},

		regAddLocal : function(data){
			_Bridge_.regAddLocal(data);
		},

		regAddFtp : function(data){
			_Bridge_.regAddFtp(data);
		},

		regUpdateFtp: function(index,data){
			_Bridge_.regUpdateFtp(index,data);
		},

		openUrl : function(url){
			_Bridge_.openUrl(url);
		},
		
		setSettings: function(name, val, callback_ok){
			_Bridge_.setSettings(""+name,""+val, function(ok){
				callback_ok(true);
			});
		},
		
		getSettings: function(name, callback_val){
			_Bridge_.getSettings(""+name, function(val){
				if (callback_val) callback_val(val);
			})
		},
		
		encode: function(data, callback_data){
			_Bridge_.encode(data, function(new_data){
				if (callback_data) callback_data(new_data);
			});
		},
		
		decode: function(data, callback_data){
			_Bridge_.decode(data, function(new_data){
				if (callback_data) callback_data(new_data);
			});
		},
		
		download: function(url, callback_url, headers){
			var tmp_url = _Bridge_.download(url, headers ||{});
			if (callback_url) callback_url(tmp_url);
		},
		// not tested !!!
		// create signal
		// _dwFinished
		// _dwError
		download2: function(url, callback_url, headers){
			_Bridge_.download2(url, headers ||{}, function(id){
				Bridge._download2_callbacks[id] = callback_url;
			});
		},
		_download2_callbacks: {},
		// download_id
		// local_url (from tmp)
		_dwFinished: function(id, url){
			if (!Bridge._download2_callbacks[id]) {
				setTimeout(function(){Bridge._dwFinished(id, url), 100});
				return;
			}
			
			try{
				Bridge._download2_callbacks[id](url);
			}
			catch(e){
				console.error("Bridge.download2 callbacks," + url);
			}
			if (id) Bridge._download2_callbacks[id] = 0;
		},
		_dwError: function(id, error){
			Bridge._dwFinished(id, "");
			console.log("_dwError", id, error);
		},
		
		quit: function(){
			_Bridge_.quit();
		},
		
		// Attention!! Bind this function only user onclick event
		stopQuit: function(){
			_Bridge_.stopQuit();
		}
	}
	
	// extend record
	function extend(to,from,rewrite){
		for(var p in from)
			if (rewrite || !(p in to))
				to[p] = from[p];
		return to;
	}
	
	window.Bridge = extend( window.Bridge || {}, Bridge0, true);
	Bridge0 = 0
	
})();
