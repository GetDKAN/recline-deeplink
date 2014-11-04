/*jshint multistr:true */

this.recline = this.recline || {};
this.recline.DeepLink = this.recline.DeepLink || {};

(function($, my) {
  'use strict';

  my.Router = function(multiview){
    var self = this;
    var currentView = null;
    var r;
    var changes = {};

    self.updateState = function(state){
      var multiviewState = self.parmsToState(state);
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
          }
        });
      }
    };

    self.parmsToState = function(serializedState){
      var state;
      try{
        state = JSON.parse(decodeURI(serializedState));
      } catch(e){
        state = null;
      }
      return state;
    };

    self.stateToParams = function(state){
      var params;
      try{
        params = encodeURI(JSON.stringify(_.omit(state.attributes, 'dataset')));
      } catch(e){
        params = null;
      }
      return params;
    };

    self.replaceAll = function(find, replace, str) {
      return str.replace(new RegExp(find, 'g'), replace);
    };

    self.onStateChange = function(event){
      var newState = new recline.Model.ObjectState();

      changes = self.saveChanges(multiview.state.changed, changes);
      newState.attributes = changes;
      r.navigate(self.stateToParams(newState));
      self.updateControls();
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
      r = new Router();
      multiview.listenTo(multiview.state, 'all', self.onStateChange);
      multiview.model.bind('all', self.onStateChange);
      Backbone.history.start();
    };

    self.initialize();
  };


})(jQuery, this.recline.DeepLink);
