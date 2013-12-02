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

    // We are now back to pulling all content dynamically (leaving the logic
    //   below intact in case we want to revert later)
    return true;

    // To refresh the data cache, include '?fetch' in the URL
    // Counters always get refreshed

    if (name === 'counters') {
      return true;
    } else {
      return (window.location.href.indexOf('fetch') != -1);
    }
  },

  showDataFromGDocs: function() {

    // Disabling this for now
    return;

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
        error: function() {
          data = dataCache[name];
          content[name] = data;
          RJ.templatize(name, content, columns);
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
      var donatedAmount = RJ.normalizeCounterValue(data.counters[0].amount);
      var abolishAmount = RJ.normalizeCounterValue(data.counters[1].amount);
      RJ.counter.options.counterStart = donatedAmount - 3;
      RJ.counter.options.counterEnd = donatedAmount;
      if (RJ.counter.options.counterStart == RJ.counter.options.counterEnd) {
        // In case the last digit of donatedAmount is zero
        RJ.counter.options.counterStart -= 10;
      }
      $('.counter').jOdometer(RJ.counter.options);
      $('.donations').html(RJ.commify(abolishAmount));
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
   * Utility function for parsing counter string value into an integer
   *
   */
  normalizeCounterValue: function(x) {
    // Strip out decimal value
    x = x.toString().replace(/\.(\d+)/);
    // Remove any non-decimal characters
    x = x.replace(/\D/, '');
    return parseInt(x);
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

    tweet: 'You are not a loan. #RollingJubilee #PeoplesBailout @StrikeDebt',

    getURL: function(target, status) {
      var base = 'https://twitter.com/home?',
          status = (status !== undefined) ? status : RJ.twitter.tweet;
      if (target !== undefined) {
        return base + 'status=.' + encodeURIComponent(target + ' ' + status);
      }
      return base + 'status=' + encodeURIComponent(status);
    }

   },

   /**
    * Ecard stuff
    *
    */
   ecard: {

      chosen_graphic: 'one',
      recipient_name: 'Friend',
      first_name: 'Your Friend',
      donation_amount: 0,

      // gets info stored in cookie
      get: function(cookie) {
        if (cookie) {
          $.each($.parseJSON(cookie), function(i, v){
            if ($('#' + i).length > 0) {
              $('#' + i).val(v);
              RJ.ecard[i] = v;
            }
            //console.log(v);
            if (i === 'chosen_graphic') {
              $('.ecard #options div').removeClass('selected');
              $('#' + v).addClass('selected');
              RJ.ecard.chosen_graphic = v;
            }
          });
        }
      },

      // loads generated image
      getPreview: function() {
        var chosen_graphic = RJ.ecard.chosen_graphic ? RJ.ecard.chosen_graphic : 'one';
        var amount = RJ.ecard.donation_amount ? RJ.ecard.donation_amount : '0';
        var recipient_name = RJ.ecard.recipient_name ? RJ.ecard.recipient_name : 'Friend';
        var first_name = RJ.ecard.first_name ? RJ.ecard.first_name : 'Your friend';
        return 'http://aaron.bornstein.org/x/generate.php?image_number=' + chosen_graphic + '&recipient_name=' + recipient_name + '&first_name=' + first_name + '&amount=' + amount;
      },

      checkURLParams: function() {
        var image_number = RJ.ecard.getParameterByName('image_number');
        var donation_amount = RJ.ecard.getParameterByName('donation_amount');
        var recipient_name = RJ.ecard.getParameterByName('recipient_name');
        var first_name = RJ.ecard.getParameterByName('first_name');
        if (image_number && donation_amount && recipient_name && first_name) {
          RJ.ecard.chosen_graphic = image_number;
          RJ.ecard.donation_amount = donation_amount;
          RJ.ecard.recipient_name = recipient_name;
          RJ.ecard.first_name = first_name;
          RJ.ecard.updatePrintableContent();
          $('body').addClass('permalinked');
        }
      },

      // This function is by Artem Barger
      // from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values
      getParameterByName: function(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.search);
        if(results == null)
          return null;
        else
          return decodeURIComponent(results[1].replace(/\+/g, " "));
      },

      // check if they've entered something for all necessary fields
      checkFields: function() {
        $('.ecard .right input').each(function(){
          RJ.ecard[$(this).attr('id')] = $(this).val();
          if ($(this).attr('id') === 'donation_amount' && $(this).val().length < 1) {
            RJ.ecard[$(this).attr('id')] = 0;
          }
        });
        $('.multiplier').html(parseInt(RJ.ecard.donation_amount)*20);
        var allowSubmit = 0;
        $('.ecard .right input').each(function(){
          if ($(this).val().length > 0) {
            allowSubmit++;
            //console.log($(this).val());
            //console.log(allowSubmit);
          }
        });
        if (allowSubmit > 2) {
          $('.submit-ecard').removeClass("disabled");
          $('#more-options').removeClass("disabled");
          RJ.ecard.updatePrintableContent();
        } else {
          $('.submit-ecard').addClass("disabled");
          $('#more-options').addClass("disabled");
        }
      },

      updatePrintableContent: function() {
        var imageSrc = RJ.ecard.getPreview();
        $('#print-content').html('<img src="' + imageSrc + '">');
      },

      emailLink: function() {

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
  RJ.loadData('press', '8');

  // load ecard stuff
  //RJ.ecard.get($.cookie('rollingjubilee'));

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
    RJ.twitter.tweet = $(this).find('span').text() + ' http://rollingjubilee.org';
    location.href = RJ.twitter.getURL(RJ.twitter.target, RJ.twitter.tweet);
    return false;
  });

  // clicking on the ecard illustration optoins
  $(document).on('click', '.ecard #options div', function(e) {
    RJ.ecard.chosen_graphic = $(this).attr('id');
    $('.ecard #options div').removeClass('selected');
    $(this).addClass('selected');
    $('#preview').find('img').attr('src', $(this).find('img').attr('src').replace('_thumb', '_left'));
    e.preventDefault();
  });

  // save recipient and first name values on keyup
  $('.ecard .right input').on('keyup', $.debounce(250, function(){
    RJ.ecard.checkFields();
    //console.log(RJ.ecard);
  }));

  // Check for page reload
  RJ.ecard.checkURLParams();
  RJ.ecard.checkFields();

  // load full preview on send page
  //$('#preview-full img').attr('src', RJ.ecard.getPreview());

  // submit ecard info on send page
  $('.submit-ecard:not(.disabled)').live('click', function(){
    RJ.ecard.donation_amount = $('#donation_amount').val();
    //$.cookie('rollingjubilee', JSON.stringify(RJ.ecard));
    location.href = RJ.ecard.getPreview();
  });

  $('#print-this-page').live('click', function(){
    window.print();
    return false;
  });

  $('#email-link').live('click', function(){
    var image_number = encodeURIComponent(RJ.ecard.chosen_graphic);
    var donation_amount = encodeURIComponent(RJ.ecard.donation_amount);
    var recipient_name = encodeURIComponent(RJ.ecard.recipient_name);
    var first_name = encodeURIComponent(RJ.ecard.first_name);
    var permalink = 'http://rollingjubilee.org/gifts/?image_number=' + image_number + '&recipient_name=' + recipient_name + '&first_name=' + first_name + '&donation_amount=' + donation_amount;
    var bitlyRequest = 'http://api.bitly.com/v3/shorten?login=dphiffer&apiKey=R_67523ca32f7b9c2cd1acedd601a662a0&longUrl=' + encodeURIComponent(permalink) + '&format=json';
    $.ajax({
      url: bitlyRequest,
      dataType: 'json',
      success: function(json) {
        var subject = 'Happy Holidays!';
        var body = 'Dear ' + RJ.ecard.recipient_name + ",\n\nI'm sending you the gift of debt liberation! Just follow this link:\n" + json.data.url + "\n\nHappy Holidays!\n" + RJ.ecard.first_name;
        window.location = 'mailto:?to=&subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      }
    });
    return false;
  });

  // for the join-the-team page
  $(document).on('click', '#sample-tweets li', function() {
    location.href = RJ.twitter.getURL(undefined, $(this).find('span').text());
  });

});
