/*jshint multistr:true */

this.recline = this.recline || {};
this.recline.DeepLink = this.recline.DeepLink || {};

(function($, my) {
  'use strict';

  my.Router = function(multiview){
    var self = this;
    var currentView = null;
    var router;
    var changes = {};
    var parser = new my.Parser();
    var deep = DeepDiff.noConflict();
    var firstState = _.clone(_.omit(multiview.state.attributes, 'dataset'));

    self.updateState = function(state){
      var multiviewState = self.transform(state, self.toState);
      changes = multiviewState || {};
      if (multiviewState) {
        multiviewState = _.extend(multiview.state.attributes, multiviewState);
        multiview.model.queryState.set(multiviewState.query);
        multiview.updateNav(multiviewState.currentView);

        _.each(multiview.pageViews, function(view, index){
          var viewKey ='view-' + view.id;
          var pageView = multiview.pageViews[index];
          pageView.view.state.set(multiviewState[viewKey]);
          if(typeof pageView.view.redraw === 'function' && pageView.id === 'graph'){
            setTimeout(pageView.view.redraw, 0);
          } else if(pageView.id === 'grid') {
            pageView.view.render();
          }
        });
      }
    };

    self.transform = function(input, transformFunction){
      var result;
      try{
        result = transformFunction(input);
      } catch(e){
        console.log(e);
        result = null;
      }
      return result;
    };

    self.toState = function(serializedState){
      var stringObject = parser.inflate(decodeURI(serializedState));
      return JSON.parse(stringObject);
    };

    self.toParams = function(state){
      var stringObject = JSON.stringify(_.omit(state.attributes, 'dataset'));
      return parser.compress(stringObject);
    };

    self.onStateChange = function(event){
      var ch = deep.diff(firstState, _.omit(multiview.state.attributes, 'dataset'));
      var tempChanges = {};
      _.each(ch, function(c){
        if(c.kind === 'E'){
          self.createNestedObject(tempChanges, c.path, c.rhs);
        } else if(c.kind === 'A') {
          self.createNestedObject(tempChanges, c.path, c);
        }
      });
      changes = _.extend(changes, tempChanges);
      var newState = new recline.Model.ObjectState();
      newState.attributes = changes;
      router.navigate(self.transform(newState, self.toParams));
      self.updateControls();
    };

    self.createNestedObject = function( base, prop, value ) {
        var names = _.clone(prop);
        var lastName = arguments.length === 3 ? names.pop() : false;

        for( var i = 0; i < names.length; i++) {
            base = base[names[i]] = base[names[i]] || {};
        }

        if(lastName && !_.isArray(value) && !_.isObject(value)){
          base = base[lastName] = value;
        }

        if(_.isObject(value) && value.kind === 'A'){
          if(_.isUndefined(base[lastName])){
            base[lastName] = [];
          }
          if(value.item.kind == 'N'){
            base = base[lastName][value.index] = value.item.rhs;
          }
          if(value.item.kind == 'D'){
            base[lastName].splice(value.index, value.item.rhs);
            base = base[lastName];
          }
        }
        return base;
    };

    self.saveChanges = function(delta, changes){
      for(var change in delta){
        changes[change] = delta[change];
      }
      return changes;
    };

    self.updateControls = function(){
      var id = multiview.state.get('currentView');
      if(id === 'graph' || id === 'map') {
        var index = self.getCurrentViewIndex();
        var menuMap = {graph:'editor', map:'menu'};
        var menuName = menuMap[id];
        var menu = multiview.pageViews[index].view[menuName];
        var viewState = self.getCurrentView().view.state;
        menu.state.set(viewState.attributes);
        menu.render();
      }
    };

    self.getCurrentView = function(){
      var id = multiview.state.get('currentView');
      return _.findWhere(multiview.pageViews, {id:id});
    };

    self.getCurrentViewIndex = function(){
      var id = multiview.state.get('currentView');
      var index;
      _.each(multiview.pageViews, function(item, i){
        if(item.id === id){
          index = i;
        }
      });
      return index;
    };

    self.initialize = function(){
      var Router = Backbone.Router.extend({
        routes: {
          '*state': 'defaultRoute',
        },
        defaultRoute: function(state) {
          self.updateState(state);
        }
      });
      router = new Router();
      multiview.listenTo(multiview.state, 'all', self.onStateChange);
      multiview.model.bind('all', self.onStateChange);
      Backbone.history.start();
    };

    self.initialize();
  };

  my.Parser = function(){
    var self = this;
    var compressMap = {
      'backend':'b',
      'currentView': 'c',
      'dataset':'d',
      'fields': 'f',
      'records': 'r',
      'query': 'qy',
      'facets': 'fc',
      'filters':'fl',
      'from': 'fr',
      'q':'q',
      'size':'sz',
      'readOnly':'ro',
      'url':'ul',
      'view-graph': 'vga',
      'graphType': 'gt',
      'group': 'gp',
      'series': 'sr',
      'view-grid':'vgi',
      'columnsEditor': 'ce',
      'columnsOrder': 'co',
      'columnsSort': 'cs',
      'columnsWith':'cw',
      'fitColumns': 'fcm',
      'gridOptions': 'go',
      'hiddenColumns': 'hc',
      'options':'op',
      'view-map':'vm',
      'autoZoom': 'az',
      'cluster': 'cl',
      'geomField': 'gf',
      'latField': 'laf',
      'lonField': 'lof',
    };

    self.compress = function(str){
      //replace words
      //remove start and end brackets
      //replace true by 1 and false by 0
      return self.escapeStrings(str);
    };

    self.inflate = function(str){
      return self.parseStrings(str);
    };

    self.escapeStrings = function(str){
      str = str.replace(/"([a-zA-Z-]+)"\s?:/g ,  "$1:");
      return str.replace(/"([a-zA-Z-#]+)"/g ,  "!$1");
    };

    self.parseStrings = function(str){
      str = str.replace(/([a-zA-Z-]+)\s?:/g ,  "\"$1\":");
      return str.replace(new RegExp('!([a-zA-Z-#]+)', 'g'),  "\"$1\"");
    };
  };

})(jQuery, this.recline.DeepLink);
