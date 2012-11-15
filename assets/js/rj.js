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
   * Setup data caching
   *
   */
  setupDataCaching: function() {
    if (RJ.fetchDataFromGDocs()) {
      dataCache = {};
    }
    RJ.pendingGDocsRequests = 0;
  },

  fetchDataFromGDocs: function(name) {
    // To refresh the data cache, include '?fetch' in the URL
    // Counters always get refreshed
    
    // Don't fetch counters until we work out why it's breaking
    
    //if (name === 'counters') {
    //  return true;
    //} else {
      return (window.location.href.indexOf('fetch') != -1);
    //}
  },

  showDataFromGDocs: function() {
    var textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.style.position = 'absolute';
    textarea.style.left = '20px';
    textarea.style.top = '20px';
    textarea.style.width = '500px';
    textarea.style.height = '250px';
    textarea.style.zIndex = '65554';
    textarea.value = 'var dataCache = ' + JSON.stringify(dataCache) + ';';
  },

  /**
   * Create a new Miso dataset and load a Google spreadsheet into it
   * http://misoproject.com/dataset/tutorials/googlespreadsheets
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

    if (RJ.fetchDataFromGDocs(name)) {
      RJ.pendingGDocsRequests++;
      ds.fetch({
        success: function() {
          this.each(function(row) {
            data.push(row);
          });
          content[name] = data;
          dataCache[name] = data;
          RJ.pendingGDocsRequests--;
          if (RJ.fetchDataFromGDocs() && RJ.pendingGDocsRequests == 0) {
            RJ.showDataFromGDocs();
          }
          RJ.templatize(name, content, columns);
        },
        error : function() {
          console.log("Error loading Google spreadsheet.");
        }
      });
    } else {
      data = dataCache[name];
      content[name] = data;
      RJ.templatize(name, content, columns);
    }

  },

  /**
   * Feed data into a Handlebars template
   * http://handlebarsjs.com
   */
  templatize: function (name, data, columns) {

    // if it's a video we're dealing with, extract the video id to grab a thumbnail
    if (name === 'videos') {
      _.each(data.videos, function(num, key){
        var video_id = data.videos[key].video_url.split('v=')[1],
            ampersandPosition = video_id.indexOf('&');
        if(ampersandPosition !== -1) {
          video_id = video_id.substring(0, ampersandPosition);
        }
        data.videos[key].thumbnail = 'https://i3.ytimg.com/vi/' + video_id + '/0.jpg';
      });
    }

    // the counter text is kinda weird so we do some special stuff
    if (name === 'counters') {
      RJ.counter.options.counterStart = Math.round(parseInt(data.counters[0].amount) / 10) * 10;
      RJ.counter.options.counterEnd = parseInt(data.counters[0].amount);
      $('.counter').jOdometer(RJ.counter.options);
      $('.donations').html(RJ.commify(parseInt(data.counters[1].amount)));
      return;
    }

    // if columns have been specified, transform the array
    if (columns !== undefined) {
      data = RJ.transform(data[name], columns);
    }

    // check to see if the template exists
    if ($('#' + name + '-template').length > 0) {

      // if it does, do the handlebars magic
      var source = $('#' + name + '-template').html(),
          template = Handlebars.compile(source);
      $('#' + name + '-container').append(template(data));

    }

  },

  /**
   * Utility function to splice an array into a specified number of columns
   *
   */
  transform: function (arr, num) {

    var result = [],
        temp = [];
    _.each(arr, function ( elem, i ) {
      if (i > 0 && i % num === 0) {
        result.push( temp );
        temp = [];
      }
      temp.push( elem );
    });
    if (temp.length > 0) {
      result.push(temp);
    }
    return result;

  },

  /**
   * Utility function for adding commas to numbers
   *
   */
  commify: function (x) {
      return '$' + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  /**
   * Counter
   *
   */
  counter: {
    options: {
      increment: 1,
      delayTime: 500,
      counterStart: 0,
      counterEnd: 0,
      numbersImage: 'http://rollingjubilee.org/assets/img/jodometer-numbers-24pt.png',
      widthNumber: 32,
      heightNumber: 54,
      spaceNumbers: 0,
      offsetRight: -10,
      maxDigits: 10,
      prefixChar: true
    }
  },

  /**
   * Twitter tool
   *
   */
   twitter: {

    tweet: 'On November 15: Remember, remember, debt is not forever. #RollingJubilee #PeoplesBailout @StrikeDebt',

    getURL: function(target, status) {
      var base = 'https://twitter.com/home?',
          status = (status !== undefined) ? status : RJ.twitter.tweet,
          url = 'http://ow.ly/eT6fr';
      if (target !== undefined) {
        return base + 'status=.' + encodeURIComponent(target + ' ' + status + ' ' + url);
      }
      return base + 'status=' + encodeURIComponent(status + ' ' + url);
    }

   }

};

/**
 * When DOM is loaded...
 *
 */
$(function(){

  RJ.setupDataCaching();

  // load all the different worksheets
  RJ.loadData('videos', '1', 4);
  RJ.loadData('allies', '2');
  RJ.loadData('knowledge', '3');
  RJ.loadData('social-media', '4');
  RJ.loadData('faq1', '5');
  RJ.loadData('faq2', '6');
  RJ.loadData('counters', '7');

  // fancy box modals
  $('.fancybox-media').fancybox({
		openEffect: 'none',
		closeEffect: 'none',
		helpers: {
			media: {}
		}
	});

  // scroll when nav items are clicked
  $(document).on('click', 'nav.main a, a.scroll', function() {
    var el = $(this).attr('href'),
        loc = $(el).offset().top - 20;
    $("html,body").animate({
        scrollTop: loc
      }, 700);
    return false;
  });

  // clicking on a journo's mug
  $(document).on('click', '.journalists li', function() {
    $(this).addClass('selected').siblings().removeClass('selected');
    RJ.twitter.target = $(this).find('.username').text();
    $('.statuses').slideDown();
    var loc = $('.statuses').offset().top;
    $("html,body").animate({
        scrollTop: loc
      }, 300);
    return false;
  });

  // clicking on a tweet under the journos
  $(document).on('click', '.statuses li', function() {
    $(this).addClass('selected').siblings().removeClass('selected');
    RJ.twitter.tweet = $(this).find('span').text();
    location.href = RJ.twitter.getURL(RJ.twitter.target, RJ.twitter.tweet);
    return false;
  });

  // for the join-the-team page
  $(document).on('click', '#sample-tweets li', function() {
    location.href = RJ.twitter.getURL(undefined, $(this).find('span').text());
  });

});