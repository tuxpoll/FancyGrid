/*
 * @class Fancy.grid.plugin.Tree
 * @extends Fancy.Plugin
 */
(function () {

  var getChildNumber = function (items, num) {
    num = num || 0;
    var me = this,
      w = me.widget;

    Fancy.each(items, function (item) {
      num++;
      var itemData = item.data?item.data:item;
      //Getting item data from grid
      itemData = w.getById(itemData.id).data;

      if(itemData.child && itemData.expanded){
        num += getChildNumber.apply(me, [itemData.child]);
      }
    });

    return num;
  };

  Fancy.define('Fancy.grid.plugin.Tree', {
    extend: Fancy.Plugin,
    ptype: 'grid.tree',
    inWidgetName: 'tree',
    singleExpand: false,
    /*
     * @constructor
     * @param {Object} config
     */
    constructor: function (config) {
      this.Super('const', arguments);
    },
    /*
     *
     */
    init: function () {
      var me = this;

      me.expandMap = {};

      me.Super('init', arguments);
      me.ons();
    },
    /*
     *
     */
    ons: function () {
      var me = this,
        w = me.widget;

      w.once('init', function () {
        w.on('rowdblclick', me.onRowDBLClick, me);
        w.on('cellclick', me.onTreeExpanderClick, me);
        w.on('beforesort', me.onBeforeSort, me);
      });
    },
    onRowDBLClick: function (grid, o) {
      var me = this,
        w = me.widget,
        item = o.item;

      if (item.get('leaf')) {
        return;
      }

      if(w.edit && w.edit.clicksToEdit === 2){
        return;
      }

      var expanded = item.get('expanded');

      if (expanded) {
        me.collapseRow(o.item);
      }
      else {
        me.expandRow(o.item);
      }
    },
    onTreeExpanderClick: function (grid, o) {
      var me = this,
        item = o.item,
        target = Fancy.get(o.e.target);

      if(!target.hasClass('fancy-grid-tree-expander')){
        return;
      }

      if (item.get('leaf')) {
        return;
      }

      var expanded = item.get('expanded');

      if (expanded) {
        me.collapseRow(o.item);
      }
      else {
        me.expandRow(o.item);
      }
    },
    collapseRow: function (item) {
      var me = this,
        w = me.widget,
        s = w.store,
        child = item.get('child'),
        filteredChild = item.get('filteredChild'),
        id = item.get('id');

      me.expandMap[id] = false;

      if(filteredChild){
        child = filteredChild;
      }

      item.set('expanded', false);

      var rowIndex = s.getRow(item.get('id')),
        i = 0,
        iL = getChildNumber.apply(this, [child]);

      w.store.treeCollapsing = true;
      for (; i < iL; i++) {
        w.removeAt(rowIndex + 1);
      }
      delete w.store.treeCollapsing;

      //if(!child){
        w.update();
      //}
    },
    expandRow: function (item) {
      var me = this,
        w = me.widget,
        s = w.store,
        child = item.get('child'),
        filteredChild = item.get('filteredChild'),
        id = item.get('id'),
        parentId = item.get('parentId');

      if(filteredChild){
        child = filteredChild;
      }

      if(me.singleExpand){
        if(parentId){
          var parent = w.getById(parentId),
            parentChild = parent.get('child');

          //Bad for performance
          Fancy.each(parentChild, function (item) {
            var expanded = item.get('expanded');

            if(me.expandMap[item.id] !== undefined){
              expanded = me.expandMap[item.id];
            }

            if(expanded === true) {
              me.collapseRow(w.getById(item.id));
            }
          });
        }
        else{
          var parentChild = w.findItem('parentId', '');

          Fancy.each(parentChild, function (child) {
            var expanded = child.get('expanded');

            if(me.expandMap[child.id] !== undefined){
              expanded = me.expandMap[child.id];
            }

            if(expanded === true) {
              me.collapseRow(child);
            }
          });
        }
      }

      me.expandMap[id] = true;

      item.set('expanded', true);

      var rowIndex = s.getRow(item.get('id')),
        deep = item.get('$deep') + 1,
        childsModelsRequired = false;

      var expandChilds = function (child, rowIndex, deep, _id) {
        _id = _id || id;

        Fancy.each(child, function (item, i) {
          var itemData = item.data;
          if(!item.data){
            childsModelsRequired = true;
            itemData = item;
          }

          itemData.$deep = deep;
          itemData.parentId = _id;
          var expanded = itemData.expanded;
          if(me.expandMap[itemData.id] !== undefined){
            expanded = me.expandMap[itemData.id];
            itemData.expanded = expanded;
          }

          rowIndex++;
          w.insert(rowIndex, itemData);

          if(expanded === true){
            var child = itemData.child;
            if(itemData.filteredChild){
              child = itemData.filteredChild;
            }
            rowIndex = expandChilds(child, rowIndex, deep + 1, itemData.id);
          }
        });

        return rowIndex;
      };

      w.store.treeExpanding = true;
      expandChilds(child, rowIndex, deep);
      delete w.store.treeExpanding;

      if(childsModelsRequired){

        Fancy.each(item.data.child, function (_child, i) {
          var childItem = s.getById(_child.id);

          //This case could occur for filtered data
          if(childItem === undefined){
            return;
          }

          item.data.child[i] = childItem;
        });
      }

      //if(!child){
        w.update();
      //}

      //Sorted
      if(s.sorters){
        //TODO: needed to do sub sorting of only expanded
        //If item contains sorted than needs to detirmine that it suits or not
        //Also it needs to think about multisorting
        var sorter = s.sorters[0];

        s.sort(sorter.dir.toLocaleLowerCase(), sorter._type, sorter.key, {});
      }
    },
    onBeforeSort: function (grid, options) {
      var me = this;

      if(options.action === 'drop'){
        me.onDropSort();
      }
    },
    onDropSort: function () {
      var me = this,
        w = me.widget,
        s = w.store;

      s.treeReBuildData();
    }
  });

})();