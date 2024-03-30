var app = function(){
  var base_dir = (location.pathname.replace('/index.html', '/') +
                  "/files/").replace(/\/\//g, '/');
  var current_dir = (base_dir + location.hash.substring(1) +
                     '/').replace(/\/\//g, '/');
  var IMG_EXTENSIONS = ['bmp', 'gif', 'jpg', 'jpeg', 'jpe', 'png'];
  var IGNORED_ELEMENTS = ['../', 'Name', 'Last modified', 'Size', 'Description',
                          'Parent Directory', '.thumbs/'];
  var imgCache = [];
  var prev_img = "";
  var next_img = "";

  function createThumbnail(href, name) {
    var thumbnail;
    if (isImage(href + name) && name.split('.').pop().toLowerCase() != "gif") {
      thumbnail = document.createElement('img');
      thumbnail.src = (href+name).replace("/files/", "/files/.thumbs/")
      thumbnail.loading = "lazy"
    }
    return thumbnail;
  }

  // create a tile
  function createTile(href, name) {
    var header = document.createElement('header');

    var glyphicon = document.createElement('span');
    glyphicon.className = "glyphicon glyphicon-file";
    glyphicon.setAttribute('aria-hidden', 'true');

    var title = document.createElement('span');
    title.innerText = decodeURIComponent(name);

    header.appendChild(glyphicon);
    header.appendChild(title);

    var a = document.createElement('a');
    a.href = href+name;

    a.appendChild(header);

    if (name.endsWith("/")) {
      $.get(href+name, function(data) {
        html = $.parseHTML(data);
        entries = $(html).find("a");
        matched = "";
        for (let i=0; i < entries.length; i++) {
          if (isValidTile(entries[i].getAttribute('href')) && !entries[i].getAttribute('href').endsWith('/')) {
            matched = entries[i].getAttribute('href')
            break
          }
        }
        var thumbnail = createThumbnail(href+name, matched);
        if (thumbnail) a.appendChild(thumbnail);
      });
    } else {
      var thumbnail = createThumbnail(href, name);
      if (thumbnail) a.appendChild(thumbnail);
    }
    return a;
  }

  // cache an image for future usage
  function cacheImage(file) {
    for (var i=0; i<imgCache.length; i++) {
      if (imgCache[i].src == file) return;
    }
    if (imgCache.length > 50) {
      imgCache = imgCache.splice(imgCache.length-50, 50)
    }
    imgCache.push(file);
  }

  // check if the given path points to an image
  function isImage(path) {
    return $.inArray(path.split('.').pop().toLowerCase(), IMG_EXTENSIONS) != -1;
  }

  function isValidTile(name) {
    return $.inArray(name, IGNORED_ELEMENTS) == -1;
  }

  // load the contents of the given directory
  function cd(dir) {
    current_dir = decodeURIComponent(dir);

    location.hash = current_dir.replace(base_dir, '');

    // show the location bar
    $(".current-dir").text('');
    var path = current_dir.replace(base_dir, '/').split('/');

    var temp_path = "";
    for (var i=0; i<path.length-1; i++) {
      var a = document.createElement('a');
      temp_path += path[i] + '/';
      $(a).text(path[i] + '/');
      a.title = base_dir + temp_path.substring(1);
      $(a).click(function(){
        cd(this.title);
      });
      $(".current-dir").append(a);
    }

    // retrieve the contents of the directory
    $.get(current_dir, function(data) {
      html = $.parseHTML(data);
      $(".browser-view").html("");

      // create tiles
      let entries = $(html).find("a");
      entries.sort((x, y) => {
        let a = x.getAttribute('href') || "";
        let b = y.getAttribute('href') || "";

        if (a.endsWith("/") && !b.endsWith("/"))
          return -1;
        if (!a.endsWith("/") && b.endsWith("/"))
          return 1;
        return a.localeCompare(b, undefined, { 'numeric': true })
      });
      entries.each(function(i, element){
        if (isValidTile(element.getAttribute('href'))) {
          $(".browser-view").append(
            createTile(current_dir, element.getAttribute('href')));
        }
      });

      // add events to tiles
      $(".browser-view a").each(function(i, element){
        if (element.pathname.slice(-1) == "/" ) {
          // open directories
          $(element).click(function(e) {
            e.preventDefault();
            cd(element.pathname);
          });
        } else if (isImage(element.pathname)) {
          // show image previews
          $(element).click(function(e) {
            e.preventDefault();
            showPreview(element.pathname);
          });
        }
      });
    });
  }

  // show an image preview of the given file
  function showPreview(filepath){
    $(".file-viewer").css('display', 'block');
    $(".file-view-img-loading").css('display', 'block');
    $(".file-view-img").fadeOut();

    var img = new Image();
    img.src = filepath;
    img.onload = function() {
      $(".file-view-img-loading").css('display', 'none');
      $(".file-view-img").attr('src', filepath);
      $(".file-view-img").fadeIn();
      var scale_width = 0.8 * $(window).width() / img.width;
      var scale_height = 0.8 * $(window).height() / img.height;
      var imgWidth = img.width * Math.min(scale_width, scale_height);
      var imgHeight = img.height * Math.min(scale_width, scale_height);
      $(".file-view-wrapper").css('width', imgWidth);
      $(".file-view-wrapper").css('height', imgHeight); 
    };
    cacheImage(filepath);

    // search for the previous and next image to be displayed
    var first_img = "";
    var last_img = "";
    prev_img = "";
    next_img = "";
    var img_found = false;
    $(".browser-view a").each(function(i, element){
      if (isImage(element.pathname)) {
        if (first_img === "") first_img = element.pathname;
        if (img_found && next_img === "") { next_img = element.pathname; }
        if (element.pathname == filepath) img_found = true;
        if (!img_found) prev_img = element.pathname;
        last_img = element.pathname;
      }
    });
    if (next_img === "") next_img = first_img;
    if (prev_img === "") prev_img = last_img;
  }

  // close the image preview
  function closePreview() {
    $(".file-viewer").css('display', 'none');
    $(".file-view-img").attr('src', '');
  }

  // add various event handlers
  $('.file-view-prev').click(function(){
    showPreview(prev_img);
  });
  $('.file-view-next').click(function(){
    showPreview(next_img);
  });
  $("body").keydown(function(event) {
    switch (event.which) {
      case 27: // ESC
        closePreview();
        break;
      case 37: // left arrow key
        showPreview(prev_img);
        break;
      case 39: // right arrow key
        showPreview(next_img);
        break;
    }
  });
  $(".bg-translucent").click(closePreview);
  $('.base-dir-icon').click(function(){
    cd(base_dir);
  });
  window.addEventListener('hashchange', function () {
    pointed_dir = (base_dir + location.hash.substring(1) + '/').replace(/\/\//g, '/');
    if (current_dir != pointed_dir) {
      cd(pointed_dir)
    }
});

  cd(current_dir);
}();
