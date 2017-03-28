// Bridge implementation for QWebView version
(function(){

	// prevent dublicated write
	if (window.Bridge && window.Bridge._level0)
		return;
	
	// init Bridge level0 
	var Bridge0 = {
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
			callback_args(eval(_Bridge_.getArgs()));
		},

		// Bridge.onDrop = function(files){ for (var i=0; i<files.length; i++) console.log("drop:" + files[i]) }
		onDrop: 0,
		// Bridge.onClose() -- DEPRICATED, use Bridge.bind("close",function(){}) instead
		
		onLoadRequest : 0,

		// ex: Bridge.getRecents().split("\n")[0]
		getRecents: function(callback){
			callback(_Bridge_.getRecents());
		},

		// Bridge.templating(filePath) > return templating file
		templating : function(filePath) {
		   return filePath;
		 },

		// String caption, String dir, String filter
		// Bridge.runFileDialog("Select file for export", "c:/index.html", "HTML pages (*.html *.htm)", function(path){console.log(path);}) > return "c:/index.html"
		// @callback = function(path)
		runFileDialog: function(caption, dir, filter, callback_path, multi){
			var path = _Bridge_.openFileDialog(caption,dir,filter,!!multi);
			if (multi && path)
				path = JSON.parse(path);
			callback_path(path);
		},


		// save file to local drive
		// avoid to save/load large data
		// ex: Bridge.saveLocalFile(Bridge.getRecents().split("\n")[0].split("///")[1]+"/project.json", data)
		saveLocalFile: function(path, data, callback_ok){
			var ok = _Bridge_.saveLocalFile(path,data);
			if (callback_ok) callback_ok(ok);
		},

		// load file from disk (or resource)
		// ex: var data = Bridge.loadLocalFile(Bridge.getRecents().split("\n")[0].split("///")[1]+"/project.json")
		loadLocalFile: function(path,callback){
		   // return _Bridge_["loadLocalFile(QString)"](path)
			callback(_Bridge_.loadLocalFile(path));

		},
		
		
		copyLocal: function(src, dest, callback_newpath){
			var newpath = _Bridge_.copyLocal(src, dest); 
			if (callback_newpath) callback_newpath(newpath);
		},
		
		removeLocal: function(url, callback_ok){
			var ok = _Bridge_.removeLocal(url);
			if (callback_ok) callback_ok(ok);
		},
		
		isExistsLocal: function(url, callback_ok){
			var ok = _Bridge_.isExistsLocal(url);
			if (callback_ok) callback_ok(ok);
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
			var list = _Bridge_.dirList( url, (options.names||["*"]).join(";"), options.filter ||1, ("recursive" in options? options.recursive: true) );
			list = list? (""+list).split("\n"): [];
			if (callback_list) callback_list(list);
		},

		moveLocal: function(src, dest, callback_ok){
			var ok = _Bridge_.moveLocal(src, dest);
			if (callback_ok) callback_ok(ok);
		},
		
		loadLocalBase64: function(url, callback){
			callback(_Bridge_.loadLocalBase64(url));
		},
		
		saveLocalBase64: function(url, data, callback_ok){
			var ok = _Bridge_.saveLocalBase64(url, data);
			if (callback_ok) callback_ok(ok);
		},
		
		md5_base64: function(url, callback_md5){
			var md5 = _Bridge_.md5_base64(url);
			if (callback_md5) callback_md5(md5);
		},

		// get project file from destanition folder
		// @url - folder url as in resent list
		// ex: Bridge.getProject(Bridge.getRecents().split("\n")[0]+"/project.json")
		getProject: function(url,callback){
		  //  return _Bridge_["getProjectFile(QString)"](url)
			callback(_Bridge_.getProjectFile(url));
		},

		/**
		 *  Upload files (in list) to supported destanition
		 *  @type FileManaderUploader
		 *  @see Bridge.FileManaderUploader
		 */
        uploadBuildIn: function(url, list, options){
			var SUPPORTED = "file|ftp|ftps|sftp".split("|");
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
		
		// file loading is start
		// this function alled from QT as callback events
		_fmFile: function(file){
			if (Bridge._uploadInstance)
				Bridge._uploadInstance.emit("onFile", file);
		},
		// file manadger save
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
		
		/**
		 * !! DEPRICATED and baggy, use transformImage instead
 		 * resize image from src, to setted size , with various quality and format
		 * ex : Bridge.resizeImage("E:/hoho.jpg",100,100,true,100,"jpg");
		 * 
		 * @param  {String}   src             url to image
		 * @param  {Integer}  width           default =-1 - resize only for height
		 * @param  {Integer}  height          default =-1 - resize only for width
		 * @param  {Bool}     keepAspectRatio 
		 * @param  {Integer}  quality         (1-100)
		 * @param  {String}   format          png/jpg
		 * @param  {Function} callback        function(new_image_path)
		 */
		resizeImage: function(src, width, height, keepAspectRatio, quality, format, callback){
			callback(_Bridge_.resizeImage(src,width,height,keepAspectRatio,quality,format));
		},

		/**
		 * Transform image by params.
		 * level0 function
		 * if width and height ==-1 then no resize, only convert to format and copy
		 * if doKeepAspect == false then params shrinkLarge and stretchSmall will be ignored
		 * if shrinkLarge, stretchSmall == false then scale image by inscribing into specified size, you may use without one of dimension - image scaled to another
		 * if shrinkLarge, stretchSmall == true then image always (grow small, srink large) inscribing and addition by fillColor to specified size
		 * 
		 * @param  {String}   src                     url to source image
		 * @param  {Object}   options       		  resize options
		 * @param  {Integer}  options.width           result width (default=-1)
		 * @param  {Integer}  options.height          result height (default=-1)
		 * @param  {Bool}     options.keepAspectRatio keep aspect ratio (default=true) 
		 * @param  {Bool}     options.shrinkLarge     shrink large (then specified) image side(-s) to specified size (default=false), another side will be addition by fillColor
		 * @param  {Bool}     options.stretchSmall    stretch small (then specified) image side(-s) to specified size (default=false), another side will be cut, this value usefull for screenshot's and thumbnail's
		 * @param  {Integer}  options.quality 		  save quality (1-100, by default = 100)
		 * @param  {String}   options.format 		  png/jpg (png by default)
		 * @param  {String}   options.fillColor 	  fill color for background, "" = transparent(default)
		 * @param  {Function} callback   			  function(new_image_path) - return path to new image
		 * 
		 */
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

    		callback(_Bridge_.transformImage(src, options.width||-1, options.height||-1,
                options.shrinkLarge, options.stretchSmall, options.keepAspectRatio,
                options.fillColor||"", options.quality||DEFAULTS.quality, options.format||"")
    		)
		},

		
		// make screen of page, resize if need and return image path
		// @path - path to save
		// @size - [width, height] - size to resize
		// @rect - [left,top,width,height] rect for cut
		// @callback_path = function(path) - if !path then error
		// ex: Bridge.getScreen(function(path){Bridge.openUrl(path)})
		// ex: Bridge.getScreen(
		// function(path){Bridge.openUrl(path)},
		// "",[400,200],
		// [	$("iframe").position().left,
		// 		$("iframe").position().top, 
		//		 Math.min($(window).width(),
		//		 $("iframe").width())-$("iframe").position().left, 
		//		 Math.min($(window).height()-$("iframe").position().top,
		//		 $("iframe").height())
		//	])
		getScreen : function(callback_path, path, size, rect){
			path = path || Bridge.tempLocation + "/screen" + Bridge.dateFormat(new Date(),"yyyyMMdd_hhmmss") + ".png";
			size = size || [];
			rect = rect || [];
			Bridge._screenResult.push(callback_path);
			_Bridge_.getScreen(path, size[0]||0, size[1]||0, rect[0]||0, rect[1]||0, rect[2]||0, rect[3]||0);
		},
		_screenResult: [],
		_screenReady : function(path){
			var callback = Bridge._screenResult.pop();
			if (callback)
			{
				setTimeout(function(){
					callback(path);
				}, 1)
			}
		},

		// check internal bridge
		// ex : if(isValid) loadApp();
		isValid : function(){
			if(_Bridge_ !== undefined)
				return true;
			else
				return false;
		},

		// returning object which contain data from registry
		/*
		  Struct : {
			ftpData
			{
				// last ftp folder
				folder : string
				// list of string,with ftp location
				location {
					string,string,string......
				}
			}

			gDriveData
			{
				// last gdrive folder
				folder : string
				// list of gdrive users
				location {
					string,string,string......
				}
			}

			// list of string with last local folders
			LocalData{
				string,string,string....
			}
		  }  */

		regExportData : function(callback){
			callback(_Bridge_.regExportData());
		},

		// add local path in registry(insert to 0 index,like stack)
		/*regAddLocal : function(data){
			_Bridge_.regAddLocal(data);
		},*/
		// add ftp location in regestry(insert to 0 index,like stack)
		regAddFtp : function(data){
			_Bridge_.regAddFtp(data);
		},
		// replace ftp location in registry with index @index and url @data
		regUpdateFtp: function(index,data){
			_Bridge_.regUpdateFtp(index,data);
		},
		// set ftp folder in registry
		regSetFtpFolder : function(data)
		{
			_Bridge_.regSetFtpFolder(data);
		},
		/*
		// set gdrive folder in registry
		regSetGDriveFolder : function(data)
		{
			_Bridge_.regSetGDriveFolder(data);
		},*/

		// load resource file in addiction to build type
		getResourceFile : function(path,callback)
		{
			callback(_Bridge_.getResourceFile(path));
		},

		testFtpLocation : function(url,callback){
			callback(_Bridge_.testFtpLocation(url));
		},

		clearRecentData : function(){
			_Bridge_.clearRecentData();
		},

		// unzip containter
		// usage : Bridge.unzip('E:/test/dev.zip','E:/test/outFolder')
		// files from dev.zip will be unpacked in E:/test/outFolder/dev/
		unzip : function(src_zip, dest_dir, callback_ok){
			var ok = _Bridge_.unzip(src_zip,dest_dir);
			if (callback_ok) callback_ok(ok);
		},
		// usage : Bridge.zip("e:/test/dev","e:/test/dev.zip");
		zip : function(src, dest_zip, callback_ok){
			var ok = _Bridge_.zip(src,dest_zip);
			if (callback_ok) callback_ok(ok);
		},

		openUrl : function(url){
			_Bridge_.openUrl(url);
		},
		
		setSettings: function(name, val, callback_ok){
            _Bridge_.setSettings(""+name,val);
			if (callback_ok) callback_ok(true);
		},
		
		getSettings: function(name, callback_val){
			callback_val(_Bridge_.getSettings(""+name));
		},
		
		encode: function(data, callback_data){
			var data = _Bridge_.encode(data);
			if (callback_data) callback_data(data);
		},
		
		decode: function(data, callback_data){
			var data = _Bridge_.decode(data);
			if (callback_data) callback_data(data);
		},
		
		download: function(url, callback_url, headers){
			var tmp_url = _Bridge_.download(url, headers ||{});
			if (callback_url)
				callback_url(tmp_url);
		},
		
		// create signal
		// _dwFinished
		// _dwError
		download2: function(url, callback_url, headers){
			var id = _Bridge_["download2(QString,QVariantMap)"](url, headers ||{});
			Bridge._download2_callbacks[id] = callback_url;
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
		
		// This function stop quit timer while onclose event raised
		// Attention!! Bind this function only user interactive (onclick or keydown) event!
		stopQuit: function(){
			_Bridge_.stopQuit();
		},
		
		reload: function(){
			_Bridge_.reloadWeb();
		}
	}
	
	// extend record
	function extend(to,from,rewrite){
		for(var p in from)
			if (rewrite || !(p in to))
				to[p] = from[p];
		return to;
	}
	
	window.Bridge = extend( window.Bridge || {}, Bridge0, true); // rewrite existing funcs - now use only for isValid, isPro
	Bridge0 = 0;

	_Bridge_.onDropFiles.connect(function(jsonFiles){
		Bridge.emit("drop", eval(jsonFiles));
		if (Bridge.onDrop) Bridge.onDrop(eval(jsonFiles))
	})

	// close 
	_Bridge_.onClose.connect(function(){
		if (Bridge.emit) // emit created with quit() binding
			Bridge.emit("close");
		else
			Bridge.quit();
	})

    _Bridge_.fileManagerFinished.connect(function(dest){
        if(Bridge.filemanagerCallback) Bridge.filemanagerCallback(dest)
    })
	
	
})();

