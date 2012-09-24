/**
 * Namespace the main app
 * 
 */
var RJ = RJ || {
  
  /**
   * Key of the spreadsheet we're pulling data from
   * 
   */
  SPREADSHEETKEY: '0Ao7re1ITFPKydFhKcGFDT2JpTnphbnNubTUwbThVSEE',
  
  /**
   * Create a new Miso dataset and load a Google spreadsheet into it
   * 
   */
  loadData: function (name, worksheetId, columns) {

    var data = [],
        content = {};
  
    var ds = new Miso.Dataset({
      importer: Miso.Importers.GoogleSpreadsheet,
      parser: Miso.Parsers.GoogleSpreadsheet,
      key: RJ.SPREADSHEETKEY,
      worksheet: worksheetId
    });
      
    ds.fetch({ 
      success : function() {
        this.each(function(row) {
          data.push(row);
        });
        content[name] = data;
        RJ.templatize(name, content, columns);
      },
      error : function() {
        console.log("Are you sure you are connected to the internet?");
      }
    });
      
  },
  
  /**
   * Feed data into a Handlebars template
   * 
   */
  templatize: function (name, data, columns) {
  
    if (name === 'videos') {
      _.each(data.videos, function(num, key){
        var video_id = data.videos[key].video_url.split('v=')[1],
            ampersandPosition = video_id.indexOf('&');
        if(ampersandPosition != -1) {
          video_id = video_id.substring(0, ampersandPosition);
        }
        data.videos[key].thumbnail = 'http://i3.ytimg.com/vi/' + video_id + '/0.jpg';
      });
    }
    
    // if columns have been specified, transform the array
    if (columns !== undefined) {
      data = RJ.transform(data[name], columns);
    }
    
    var source = $('#' + name + '-template').html(),
        template = Handlebars.compile(source);
    $('#' + name + '-container').append(template(data));
    
  },
  
  /**
   * Splice an array into a specified number of columns
   * 
   */
  transform: function (arr, num) {
  
    var result = [], temp = [];
    _.each(arr, function ( elem, i ) {
        if ( i > 0 && i % num === 0 ) {
            result.push( temp );
            temp = [];
        }
        temp.push( elem );
    });
    if ( temp.length > 0 ) {
        result.push( temp );
    }
    return result;
  
  }
  
}

/**
 * When DOM is loaded...
 * 
 */
$(function(){

  RJ.loadData('videos', '1', 4);
  RJ.loadData('allies', '2');
  RJ.loadData('knowledge', '3');
  RJ.loadData('social-media', '4');
  RJ.loadData('faq1', '5');
  RJ.loadData('faq2', '6');
  
  $('.fancybox-media').fancybox({
		openEffect  : 'none',
		closeEffect : 'none',
		helpers : {
			media : {}
		}
	});
  
});