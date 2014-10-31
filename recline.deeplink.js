/*jshint multistr:true */

this.recline = this.recline || {};
this.recline.DeepLink = this.recline.DeepLink || {};

(function($, my) {
  'use strict';

  my.Router = function(multiview){
    var self = this;
    var currentView = null;

    var r;


    self.updateState = function(state){
      var multiviewState = self.parmsToState(state);
      multiviewState = _.extend(multiview.state.attributes, multiviewState);

      multiview.model.queryState.set(multiviewState.query);
      multiview.updateNav(multiviewState.currentView);

      _.each(multiview.pageViews, function(view, index){
        var viewKey ='view-' + view.id;
        var pageView = multiview.pageViews[index];
        pageView.view.state.set(multiviewState[viewKey]);
        if(typeof pageView.view.redraw === 'function' && pageView.id === 'graph'){
          setTimeout(pageView.view.redraw, 0);
        }

      });

    };

    self.parmsToState = function(serializedState){
      return JSON.parse(decodeURI(serializedState));
    };

    self.stateToParams = function(state){
      return encodeURI(JSON.stringify(_.omit(state.attributes, 'dataset')));
    };

    self.onStateChange = function(event){
      console.log('onStateChange');
      r.navigate(self.stateToParams(multiview.state));
      self.updateControls();
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
      r = new Router();
      multiview.listenTo(multiview.state, 'all', self.onStateChange);
      multiview.model.bind('all', self.onStateChange);

      Backbone.history.start();
    }

    self.initialize();
  }


})(jQuery, this.recline.DeepLink);
