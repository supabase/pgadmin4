/////////////////////////////////////////////////////////////
//234567890
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getNodeTableSchema } from './table.ui';

define('pgadmin.node.table', [
  'pgadmin.tables.js/enable_disable_triggers',
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.alertifyjs', 'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.node.schema.dir/child','pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection', 'pgadmin.node.column',
  'pgadmin.node.constraints', 'pgadmin.browser.table.partition.utils',
], function(
  tableFunctions,
  gettext, url_for, $, _, pgAdmin, pgBrowser, Alertify, Backform, Backgrid,
  SchemaChild, SchemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-table']) {
    pgBrowser.Nodes['coll-table'] =
      pgBrowser.Collection.extend({
        node: 'table',
        label: gettext('Tables'),
        type: 'coll-table',
        columns: ['name', 'relowner', 'is_partitioned', 'description'],
        hasStatistics: true,
        statsPrettifyFields: [gettext('Size'), gettext('Indexes size'), gettext('Table size'),
          gettext('TOAST table size'), gettext('Tuple length'),
          gettext('Dead tuple length'), gettext('Free space')],
        canDrop: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: SchemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  if (!pgBrowser.Nodes['table']) {
    pgBrowser.Nodes['table'] = SchemaChild.SchemaChildNode.extend({
      type: 'table',
      label: gettext('Table'),
      collection_type: 'coll-table',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      statsPrettifyFields: [gettext('Size'), gettext('Indexes size'), gettext('Table size'),
        gettext('TOAST table size'), gettext('Tuple length'),
        gettext('Dead tuple length'), gettext('Free space')],
      sqlAlterHelp: 'sql-altertable.html',
      sqlCreateHelp: 'sql-createtable.html',
      dialogHelp: url_for('help.static', {'filename': 'table_dialog.html'}),
      hasScriptTypes: ['create', 'select', 'insert', 'update', 'delete'],
      width: pgBrowser.stdW.lg + 'px',
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_table_on_coll', node: 'coll-table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Table...'),
          icon: 'wcTabIcon icon-table', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_table', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 1, label: gettext('Table...'),
          icon: 'wcTabIcon icon-table', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_table__on_schema', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Table...'),
          icon: 'wcTabIcon icon-table', data: {action: 'create', check: false},
          enable: 'canCreate',
        },{
          name: 'truncate_table', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'truncate_table',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate'),
          icon: 'fa fa-eraser', enable : 'canCreate',
        },{
          name: 'truncate_table_cascade', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'truncate_table_cascade',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate Cascade'),
          icon: 'fa fa-eraser', enable : 'canCreate',
        },{
          name: 'truncate_table_identity', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'truncate_table_identity',
          category: gettext('Truncate'), priority: 3, label: gettext('Truncate Restart Identity'),
          icon: 'fa fa-eraser', enable : 'canCreate',
        },{
          // To enable/disable all triggers for the table
          name: 'enable_all_triggers', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'enable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Enable All'),
          icon: 'fa fa-check', enable : 'canCreate_with_trigger_enable',
          data: {
            data_disabled: gettext('The selected tree node does not support this option.'),
          },
        },{
          name: 'disable_all_triggers', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'disable_triggers_on_table',
          category: gettext('Trigger(s)'), priority: 4, label: gettext('Disable All'),
          icon: 'fa fa-times', enable : 'canCreate_with_trigger_disable',
          data: {
            data_disabled: gettext('The selected tree node does not support this option.'),
          },
        },{
          name: 'reset_table_stats', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'reset_table_stats',
          category: 'Reset', priority: 4, label: gettext('Reset Statistics'),
          icon: 'fa fa-chart-bar', enable : 'canCreate',
        },{
          name: 'count_table_rows', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'count_table_rows',
          category: 'Count', priority: 2, label: gettext('Count Rows'),
          enable: true,
        },
        ]);
        pgBrowser.Events.on(
          'pgadmin:browser:node:table:updated', this.onTableUpdated, this
        );
        pgBrowser.Events.on(
          'pgadmin:browser:node:type:cache_cleared',
          this.handle_cache, this
        );
        pgBrowser.Events.on(
          'pgadmin:browser:node:domain:cache_cleared',
          this.handle_cache, this
        );
      },
      callbacks: {
        /* Enable trigger(s) on table */
        enable_triggers_on_table: function(args) {
          tableFunctions.enableTriggers(
            pgBrowser.treeMenu,
            Alertify,
            this.generate_url.bind(this),
            args
          );
        },
        /* Disable trigger(s) on table */
        disable_triggers_on_table: function(args) {
          tableFunctions.disableTriggers(
            pgBrowser.treeMenu,
            Alertify,
            this.generate_url.bind(this),
            args
          );
        },
        /* Truncate table */
        truncate_table: function(args) {
          var params = {'cascade': false };
          this.callbacks.truncate.apply(this, [args, params]);
        },
        /* Truncate table with cascade */
        truncate_table_cascade: function(args) {
          var params = {'cascade': true };
          this.callbacks.truncate.apply(this, [args, params]);
        },
        truncate_table_identity: function(args) {
          var params = {'identity': true };
          this.callbacks.truncate.apply(this, [args, params]);
        },
        truncate: function(args, params) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Alertify.confirm(
            gettext('Truncate Table'),
            gettext('Are you sure you want to truncate table %s?', d.label),
            function (e) {
              if (e) {
                var data = d;
                $.ajax({
                  url: obj.generate_url(i, 'truncate' , d, true),
                  type:'PUT',
                  data: params,
                  dataType: 'json',
                })
                  .done(function(res) {
                    if (res.success == 1) {
                      Alertify.success(res.info);
                      t.removeIcon(i);
                      data.icon = data.is_partitioned ? 'icon-partition': 'icon-table';
                      t.addIcon(i, {icon: data.icon});
                      t.unload(i);
                      t.setInode(i);
                      t.deselect(i);
                      // Fetch updated data from server
                      setTimeout(function() {
                        t.select(i);
                      }, 10);
                    }
                  })
                  .fail(function(xhr, status, error) {
                    Alertify.pgRespErrorNotify(xhr, error);
                    t.unload(i);
                  });
              }
            }, function() {}
          );
        },
        reset_table_stats: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          Alertify.confirm(
            gettext('Reset statistics'),
            gettext('Are you sure you want to reset the statistics for table "%s"?', d._label),
            function (e) {
              if (e) {
                var data = d;
                $.ajax({
                  url: obj.generate_url(i, 'reset' , d, true),
                  type:'DELETE',
                })
                  .done(function(res) {
                    if (res.success == 1) {
                      Alertify.success(res.info);
                      t.removeIcon(i);
                      data.icon = data.is_partitioned ? 'icon-partition': 'icon-table';
                      t.addIcon(i, {icon: data.icon});
                      t.unload(i);
                      t.setInode(i);
                      t.deselect(i);
                      // Fetch updated data from server
                      setTimeout(function() {
                        t.select(i);
                      }, 10);
                    }
                  })
                  .fail(function(xhr, status, error) {
                    Alertify.pgRespErrorNotify(xhr, error);
                    t.unload(i);
                  });
              }
            },
            function() {}
          );
        },
        count_table_rows: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;
          if (!d)
            return false;

          /* Set the type to table so that partition module can call this func */
          let newD = {
            ...d, _type: this.type,
          };
          // Fetch the total rows of a table
          $.ajax({
            url: obj.generate_url(i, 'count_rows' , newD, true),
            type:'GET',
          })
            .done(function(res) {
              Alertify.success(res.info);
              d.rows_cnt = res.data.total_rows;
              t.unload(i);
              t.setInode(i);
              t.deselect(i);
              setTimeout(function() {
                t.select(i);
              }, 10);
            })
            .fail(function(xhr, status, error) {
              Alertify.pgRespErrorNotify(xhr, error);
              t.unload(i);
            });
        },
      },
      fetchColumnsInherits: function(arg) {
        var self = this,
          url = 'get_columns',
          m = self.model.top || self.model,
          data = undefined,
          node = this.field.get('schema_node'),
          node_info = this.field.get('node_info'),
          full_url = node.generate_url.apply(
            node, [
              null, url, this.field.get('node_data'),
              this.field.get('url_with_id') || false, node_info,
            ]
          ),
          cache_level = this.field.get('cache_level') || node.type,
          cache_node = this.field.get('cache_node');

        cache_node = (cache_node && pgBrowser.Nodes[cache_node]) || node;

        m.trigger('pgadmin:view:fetching', m, self.field);
        // Fetching Columns data for the selected table.
        $.ajax({
          async: false,
          url: full_url,
          data: arg,
        })
          .done(function(res) {
            data = cache_node.cache(url, node_info, cache_level, res.data);
          })
          .fail(function() {
            m.trigger('pgadmin:view:fetch:error', m, self.field);
          });
        m.trigger('pgadmin:view:fetched', m, self.field);
        data = (data && data.data) || [];
        return data;
      },
      getSchema: function(treeNodeInfo, itemNodeData) {
        return getNodeTableSchema(treeNodeInfo, itemNodeData, pgBrowser);
      },
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          oid: undefined,
          relowner: undefined,
          description: undefined,
          is_partitioned: false,
        },
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'create', 'edit'], disabled: 'inSchema',
        },{
          id: 'oid', label: gettext('OID'), type: 'text', mode: ['properties'],
        },{
          id: 'relowner', label: gettext('Owner'), type: 'text', node: 'role',
          mode: ['properties', 'create', 'edit'], select2: {allowClear: false},
          disabled: 'inSchema', control: 'node-list-by-name',
        },{
          id: 'is_partitioned', label:gettext('Partitioned table?'), cell: 'switch',
          type: 'switch', mode: ['properties', 'create', 'edit'],
          visible: 'isVersionGreaterThan96',
          readonly: function(m) {
            if (!m.isNew())
              return true;
            return false;
          },
        },{
          id: 'description', label: gettext('Comment'), type: 'multiline',
          mode: ['properties', 'create', 'edit'], disabled: 'inSchema',
        }],
        sessChanged: function() {
          /* If only custom autovacuum option is enabled the check if the options table is also changed. */
          if(_.size(this.sessAttrs) == 2 && this.sessAttrs['autovacuum_custom'] && this.sessAttrs['toast_autovacuum']) {
            return this.get('vacuum_table').sessChanged() || this.get('vacuum_toast').sessChanged();
          }
          if(_.size(this.sessAttrs) == 1 && (this.sessAttrs['autovacuum_custom'] || this.sessAttrs['toast_autovacuum'])) {
            return this.get('vacuum_table').sessChanged() || this.get('vacuum_toast').sessChanged();
          }
          return pgBrowser.DataModel.prototype.sessChanged.apply(this);
        },
        // We will disable everything if we are under catalog node
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info)
          {
            return true;
          }
          return false;
        },
      }),
      // Check to whether table has disable trigger(s)
      canCreate_with_trigger_enable: function(itemData, item, data) {
        return itemData.tigger_count > 0 &&
          this.canCreate.apply(this, [itemData, item, data]);
      },
      // Check to whether table has enable trigger(s)
      canCreate_with_trigger_disable: function(itemData, item, data) {
        return itemData.tigger_count > 0 && itemData.has_enable_triggers > 0 &&
          this.canCreate.apply(this, [itemData, item, data]);
      },
      onTableUpdated: function(_node, _oldNodeData, _newNodeData) {
        var key, childIDs;
        if (
          _newNodeData.is_partitioned &&
            'affected_partitions' in _newNodeData
        ) {
          var partitions = _newNodeData.affected_partitions,
            self = this,
            newPartitionsIDs = [],
            insertChildTreeNodes = [],
            insertChildrenNodes = function() {
              if (!insertChildTreeNodes.length)
                return;
              var option = insertChildTreeNodes.pop();
              pgBrowser.addChildTreeNodes(
                option.treeHierarchy, option.parent, option.type,
                option.childrenIDs, insertChildrenNodes
              );
            }, schemaNode ;

          if ('detached' in partitions && partitions.detached.length > 0) {
            // Remove it from the partition collections node first
            pgBrowser.removeChildTreeNodesById(
              _node, 'coll-partition', _.map(
                partitions.detached, function(_d) { return parseInt(_d.oid); }
              )
            );

            schemaNode = pgBrowser.findParentTreeNodeByType(
              _node, 'schema'
            );
            var detachedBySchema = _.groupBy(
              partitions.detached,
              function(_d) { return parseInt(_d.schema_id); }
            );

            for (key in detachedBySchema) {
              schemaNode = pgBrowser.findSiblingTreeNode(schemaNode, key);

              if (schemaNode) {
                childIDs = _.map(
                  detachedBySchema[key],
                  function(_d) { return parseInt(_d.oid); }
                );

                var tablesCollNode = pgBrowser.findChildCollectionTreeNode(
                  schemaNode, 'coll-table'
                );

                if (tablesCollNode) {
                  insertChildTreeNodes.push({
                    'parent': tablesCollNode,
                    'type': 'table',
                    'treeHierarchy':
                      pgAdmin.Browser.Nodes.schema.getTreeNodeHierarchy(
                        schemaNode
                      ),
                    'childrenIDs': _.clone(childIDs),
                  });
                }
              }
            }
          }

          if ('attached' in partitions && partitions.attached.length > 0) {
            schemaNode = pgBrowser.findParentTreeNodeByType(
              _node, 'schema'
            );
            var attachedBySchema = _.groupBy(
              partitions.attached,
              function(_d) { return parseInt(_d.schema_id); }
            );

            for (key in attachedBySchema) {
              schemaNode = pgBrowser.findSiblingTreeNode(schemaNode, key);

              if (schemaNode) {
                childIDs = _.map(
                  attachedBySchema[key],
                  function(_d) { return parseInt(_d.oid); }
                );
                // Remove it from the table collections node first
                pgBrowser.removeChildTreeNodesById(
                  schemaNode, 'coll-table', childIDs
                );
              }
              newPartitionsIDs = newPartitionsIDs.concat(childIDs);
            }
          }

          if ('created' in partitions && partitions.created.length > 0) {
            _.each(partitions.created, function(_data) {
              newPartitionsIDs.push(_data.oid);
            });
          }

          if (newPartitionsIDs.length) {
            var partitionsCollNode = pgBrowser.findChildCollectionTreeNode(
              _node, 'coll-partition'
            );

            if (partitionsCollNode) {
              insertChildTreeNodes.push({
                'parent': partitionsCollNode,
                'type': 'partition',
                'treeHierarchy': self.getTreeNodeHierarchy(_node),
                'childrenIDs': newPartitionsIDs,
              });
            }
          }
          insertChildrenNodes();
        }
      },
      handle_cache: function() {
        // Clear Table's cache as column's type is dependent on two node
        // 1) Type node 2) Domain node
        this.clear_cache.apply(this, null);
      },
    });
  }

  return pgBrowser.Nodes['table'];
});
