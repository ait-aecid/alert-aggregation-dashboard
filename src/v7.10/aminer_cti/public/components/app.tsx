import React, { useState, useEffect, useRef, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { PLUGIN_ID, PLUGIN_NAME } from '../../common';
import { CoreStart } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import {
  DataPublicPluginStart,
  IndexPattern,
  QueryState,
  Query,
} from '../../../../src/plugins/data/public';

import {
    EuiButton,
    EuiHorizontalRule,
    EuiPage,
    EuiPageBody,
    EuiPageContent,
    EuiPageContentBody,
    EuiPageContentHeader,
    EuiPageHeader,
    EuiTitle,
    EuiText,
    EuiFlexGroup,
    EuiFlexItem,
    EuiPanel,
    EuiSpacer,
    EuiCallOut,
    EuiBasicTable,
    EuiTextColor,
    EuiFlyout,
    EuiFlyoutBody,
    EuiFlyoutHeader,
    EuiFlyoutFooter,
    EuiButtonEmpty,
    EuiCodeBlock,
  } from '@elastic/eui';
  
  import {
    Chart,
    LineSeries, 
    Axis,
    Settings,
    ScaleType,
    timeFormatter,
    niceTimeFormatByDay,
  } from '@elastic/charts';

import moment from 'moment';
import _ from 'lodash';
import { Graph } from "react-d3-graph";
import Table from './tables';

interface AminerAppDeps {
    basename: string;
    notifications: CoreStart['notifications'];
    http: CoreStart['http'];
    navigation: NavigationPublicPluginStart;
    data: DataPublicPluginStart;
    uiSettings: CoreStart['uiSettings'];
}

export const AminerApp = ({ basename, notifications, http, navigation }: AminerAppDeps) => {

    document.title = "AMiner CTI Dashboard";
    let dateRangeFrom = null;
    let dateRangeTo = null;
    let kibanaTimeHistory = localStorage.getItem('kibana.timepicker.timeHistory');
    if (kibanaTimeHistory) {
      kibanaTimeHistory = JSON.parse(kibanaTimeHistory);
      if (kibanaTimeHistory && kibanaTimeHistory.length) {
        const lastDateRange = kibanaTimeHistory[0];
        dateRangeFrom = lastDateRange.from;
        dateRangeTo = lastDateRange.to;
      };
    };

    const url = '/data';
    const alertProps = {
        index: 'alerts*',
        sort: ['id:desc'],
    };
    const groupProps = {
        index: 'alert-groups*',
        sort: ['id:desc'],
    };
    const metaProps = {
        index: 'meta-alerts*',
        sort: ['id:desc'],
    };

    const querySize = 50;
    const aggs = {
        hits_over_time: {
            auto_date_histogram: {
                field: '@timestamp', 
                buckets: 20
            }
        }
    };
    const [ dates, setDates ] = useState({from: dateRangeFrom, to: dateRangeTo});
    const [ alertGroupIds, setAlertGroupIds ] = useState(null);
    const [ alertMetaIds, setAlertMetaIds ] = useState(null);
    const [ groupGroupIds, setGroupGroupIds ] = useState(null);
    const [ groupMetaIds, setGroupMetaIds ] = useState(null);
    const [ metaGroupIds, setMetaGroupIds ] = useState(null);
    const [ metaMetaIds, setMetaMetaIds ] = useState(null);

    const [ alertFilters, setAlertFilters ] = useState({});
    const [ metaFilters, setMetaFilters ] = useState({});
    const [ groupFilters, setGroupFilters ] = useState({});
    // selections
    let [ isAlertSelectable, setIsAlertSelectable] = useState(true);
    let [ isGroupSelectable, setIsGroupSelectable] = useState(true);
    let [ isMetaSelectable, setIsMetaSelectable] = useState(true);

    const generator_stats_index = 'generator-stats*';
    const [ alertChartData, setAlertChartData ] = useState([]);
    const [ groupChartData, setGroupChartData ] = useState([]);
    const [ metaChartData, setMetaChartData ] = useState([]);
    
    // GRAPH
    const [ isFlyoutVisible, setIsFlyoutVisible ] = useState(false);
    const [ graphData, setGraphData ] = useState({nodes: [], links: []});
    const [ metaNodes, setMetaNodes ] = useState([]);
    const [ groupNodes, setGroupNodes ] = useState([]);

    const graphConfig = {
        nodeHighlightBehavior: true,
        node: {
            color: "#d3d3d3",
            size: 300,
            highlightStrokeColor: "#ff7f7f",
            labelPosition: "top",
        },
        link: {
            highlightColor: "#ff7f7f",
        },
        width: 1200,
        height: 1200,
        directed: true,
        collapsible: false,
        // focusAnimationDuration: 0.1,
        panAndZoom: true,
    };
    
    const onClickNode = function(nodeId) {
        // console.log(nodeId)
    };
    
    const onClickLink = function(source, target) {
        // window.alert(`Clicked link between ${source} and ${target}`);
    };

    // END Graph


    const fetchStats = (from, to) => {
        http.get(url, {
            query: {
                body: JSON.stringify({
                    index: generator_stats_index,
                    body: {
                        query: {'bool': { 'filter': {
                            'range': {
                                '@timestamp': {
                                    'gte': from, 
                                    'lte': to
                                }
                            }
                        }}}
                    }
                })
            }
        }).then((resp) => {
            const hits = resp.data.hits.hits;
            const alert_counts = [];
            const group_counts = [];
            const meta_counts = [];

            hits.forEach(obj => {
                const source = obj['_source'];
                let ts = Date.parse(source['@timestamp']);
                alert_counts.push([ts, source['alert_count']]);
                group_counts.push([ts, source['group_count']]);
                meta_counts.push([ts, source['meta_count']]);
            });

           setAlertChartData(alert_counts);
           setGroupChartData(group_counts);
           setMetaChartData(meta_counts);

        }).catch((error) => {
            console.log(error)
            notifications.toasts.addDanger({
                title: 'Query result',
                text: 'An error has occurred when calling the backend',
            });
        });
    };

    const onDatetimeUpdate = (query) => {
        const { dateRange } = query;
        if (dateRange) {
            if (dateRange.from && dateRange.to) {
                setDates({from: dateRange.from, to: dateRange.to});
                fetchStats(dateRange.from, dateRange.to);
            };
        };
    };

    const handleAlertSelection = (alerts) => {
        let selectedGroupIds = [];
        let selectedMetaIds = [];

        if (alerts && alerts.length) {
            alerts.forEach((alert, index, arr) => {
                const { meta_alerts, groups } = alert._source;
                groups.forEach((groupId, idx, ar) => {
                    if (!selectedGroupIds.includes(groupId)) {
                        selectedGroupIds.push(groupId)
                    };
                });
                meta_alerts.forEach((maId, idx, ar) => {
                    if (!selectedMetaIds.includes(maId)) {
                        selectedMetaIds.push(maId)
                    };
                });
            });
        };

        let groupTerms = _.cloneDeep(groupFilters);
        let metaTerms = _.cloneDeep(metaFilters);

        if (selectedMetaIds.length) {
            Object.assign(groupTerms, {meta_alert_id: selectedMetaIds, id: selectedGroupIds});
            Object.assign(metaTerms, {id: selectedMetaIds});
            setIsGroupSelectable(false);
            setIsMetaSelectable(false);
        } else {
            groupTerms = {};
            metaTerms = {};
            setIsGroupSelectable(true);
            setIsMetaSelectable(true);
            // delete groupTerms.id;
            // delete groupTerms.meta_alert_id;
            // delete metaTerms.id;
        };
        
        setGroupFilters(groupTerms);
        setMetaFilters(metaTerms);
    };

    const handleGroupSelection = (groups) => {
        let selectedGroupIds = [];
        let selectedMetaIds = [];

        if (groups && groups.length) {
            groups.forEach((group, index, arr) => {
                const { id, meta_alert_id } = group._source;
                selectedGroupIds.push(id);
                selectedMetaIds.push(meta_alert_id);
            });
        };

        let alertTerms = _.cloneDeep(alertFilters);
        let metaTerms = _.cloneDeep(metaFilters);

        if (selectedGroupIds.length) {
            Object.assign(alertTerms, {meta_alerts: selectedMetaIds, groups: selectedGroupIds});   
            Object.assign(metaTerms, {id: selectedMetaIds});        
            setIsAlertSelectable(false);
            setIsMetaSelectable(false);
        } else {
            alertTerms = {};
            metaTerms = {};
            setIsAlertSelectable(true);
            setIsMetaSelectable(true);
            // delete alertTerms.meta_alerts;
            // delete alertTerms.groups;
            // delete metaTerms.id;
        };
        
        setAlertFilters(alertTerms);
        setMetaFilters(metaTerms);
    };

    const handleMetaSelection = (metas) => {
        let selectedMetaIds = [];

        if (metas && metas.length) {
            metas.forEach((meta, index, arr) => {
                const { id, group_id } = meta._source;
                selectedMetaIds.push(id);
            });
        };

        let alertTerms = _.cloneDeep(alertFilters);
        let groupTerms = _.cloneDeep(groupFilters);

        if (selectedMetaIds.length) {
            Object.assign(alertTerms, {meta_alerts: selectedMetaIds});   
            Object.assign(groupTerms, {meta_alert_id: selectedMetaIds});
            setIsAlertSelectable(false);
            setIsGroupSelectable(false);
            // graph
            let nodes = [];
            let links = [];
            metas.forEach((meta, index, arr) => {
                const { _id } = meta;
                let { id, group_ids } = meta._source;
                let meta_alert_id = "MA"+id.toString();
                nodes.push({"id": meta_alert_id, size: 400, color: "#fa8389", symbolType: "circle", fontSize: 11, highlightFontSize: 11});
                if (group_ids) {
                    if (group_ids.length > 11) {
                        let group_count = group_ids.length.toString() + " Groups";
                        nodes.push({"id": group_count, color: "#87ceeb", symbolType: 'circle', fontSize: 11, highlightFontSize: 11});
                        links.push({source: meta_alert_id, target: group_count});
                        let alert_count = 0;
                        group_ids.forEach((gtuple, index, arr) => {
                            let alert_ids = gtuple[1];
                            alert_count += alert_ids.length;
                        });
                        let total_alert_count = alert_count.toString() + " Alerts";
                        nodes.push({"id": total_alert_count, color: "#a8caa3", symbolType: 'circle', fontSize: 11, highlightFontSize: 11});
                        links.push({source: group_count, target: total_alert_count});
                    } else {
                        group_ids.forEach((gtuple, index, arr) => {
                            let group_id = gtuple[0];
                            let alert_ids = gtuple[1];
                            group_id = "G"+group_id.toString();
                            nodes.push({"id": group_id, color: "#87ceeb", symbolType: 'circle', fontSize: 11, highlightFontSize: 11});
                            links.push({source: meta_alert_id, target: group_id});
                            if (alert_ids) {
                                if (alert_ids.length < 11) {
                                    alert_ids.forEach((alert_id, index, arr) => {
                                        alert_id = "A"+alert_id.toString();
                                        nodes.push({"id": alert_id, color: "#a8caa3", fontSize: 11, highlightFontSize: 11});
                                        links.push({source: group_id, target: alert_id, highlightColor: "#87ceeb"});
                                    });
                                } else {
                                    let alert_count = alert_ids.length.toString() + " Alerts";
                                    nodes.push({"id": alert_count, color: "#a8caa3", symbolType: 'circle', fontSize: 11, highlightFontSize: 11});
                                    links.push({source: group_id, target: alert_count});
                                };
                            };
                        });
                    };
                };
            });
            setGraphData({nodes: nodes, links: links});
            setIsFlyoutVisible(true);
        } else {
            alertTerms = {};
            groupTerms = {};
            setIsAlertSelectable(true);
            setIsGroupSelectable(true);
            // graph
            setIsFlyoutVisible(false);
            setGraphData({nodes: [], links: []});
        };

        setAlertFilters(alertTerms);        
        setGroupFilters(groupTerms);
    };

    const alertSelection = {
        selectable: (item) => isAlertSelectable,
        onSelectionChange: handleAlertSelection,
    };

    const groupSelection = {
        selectable: (item) => isGroupSelectable,
        onSelectionChange: handleGroupSelection,
    };

    const metaSelection = {
        selectable: (item) => isMetaSelectable,
        onSelectionChange: handleMetaSelection,
        // initialSelected: JSON.parse(localStorage.getItem('selectedMetas'))
    };

    const closeFlyout = () => {
        setIsFlyoutVisible(false)
    };

    const formatDate = (d) => {
        if (d) {
            return moment(d).format('DD.MM.YYYY, h:mm:ss.mmm');
        };
        return d;
    };
    
    const formatTickDate = (d) => {
        if (d) {
            return moment(d).format('DD.MM.YYYY, h:mm:ss');
        };
        return d;
    };

    const alertColumns = [
        {
          field: '_source.@timestamp',
          name: 'Timestamp',
          sortable: true,
          dataType: 'date',
          render: (d) => formatDate(d),
        },
        {
          field: '_source.d.AnalysisComponent.AnalysisComponentName',
          name: 'Component',
        },
        {
          field: '_source.d.AnalysisComponent.Message',
          name: 'Message',
        },
        {
          field: '_source.groups',
          name: 'Groups',
        },
        {
          field: '_source.meta_alerts',
          name: 'Meta-Alerts',
          // render: (hit) => renderHit(hit)
        },
    ];

    const groupColumns = [
        {
          field: '_source.@timestamp',
          name: 'Timestamp',
          sortable: true,
          dataType: 'date',
          render: (d) => formatDate(d),
        },
        {
          field: '_source.id',
          name: 'ID',
        },    
        {
          field: '_source.meta_alert_id',
          name: 'Meta-Alert',
        }, 

        {
          field: '_source.alert_count',
          name: 'Alert count',
        },
    ];

    const metaColumns = [
        {
          field: '_source.@timestamp',
          name: 'Timestamp',
          sortable: true,
          dataType: 'date',
          render: (d) => formatDate(d),
        },
        {
          field: '_source.id',
          name: 'ID',
        },    
        {
          field: '_source.alert_count',
          name: 'Alert count',
        },
    ];
    
    return (
        <Router basename={basename}>
            <I18nProvider>
                <div style={{ padding: "1em 3em 3em" }}>
                    
                    <EuiFlexGroup justifyContent="spaceBetween">
                        <EuiFlexItem>
                            <EuiTitle size="m">
                                <h4>CTI Dashboard</h4>
                            </EuiTitle>
                        </EuiFlexItem>
                        <EuiFlexItem>
                            <navigation.ui.TopNavMenu
                                appName={PLUGIN_ID}
                                showSearchBar={true}
                                useDefaultBehaviors={true}
                                onQuerySubmit={onDatetimeUpdate}
                                dateRangeFrom={dateRangeFrom}
                                dateRangeTo={dateRangeTo}
                            />
                        </EuiFlexItem>
                    </EuiFlexGroup>
                    
                    <EuiSpacer/>

                    <EuiFlexGroup>
                        <EuiFlexItem>
                            <EuiPanel>
                                <Chart size={{height: 250}}>
                                    <Settings
                                        showLegend={true}
                                        showLegendExtra={true}
                                        legendPosition="right"
                                    />
                                    <Axis
                                        title="Count"
                                        id="left-axis"
                                        position="left"
                                        showGridLines
                                    />
                                    <Axis
                                        title={"@timestamp"}
                                        id="bottom-axis"
                                        position="bottom"
                                        tickFormat={(d) => formatTickDate(d)}
                                    />                  
                                    <LineSeries
                                        id="alerts"
                                        name="Alerts"
                                        data={alertChartData}
                                        xScaleType={ScaleType.Time}
                                        yScaleType={ScaleType.Linear}
                                        xAccessor={0}
                                        yAccessors={[1]}
                                    />
                                    <LineSeries
                                        id="groups"
                                        name="Groups"
                                        data={groupChartData}
                                        xScaleType={ScaleType.Time}
                                        yScaleType={ScaleType.Linear}
                                        xAccessor={0}
                                        yAccessors={[1]}
                                    />
                                    <LineSeries
                                        id="metas"
                                        name="Meta-Alerts"
                                        data={metaChartData}
                                        xScaleType={ScaleType.Time}
                                        yScaleType={ScaleType.Linear}
                                        xAccessor={0}
                                        yAccessors={[1]}                   
                                    />
                                </Chart>
                            </EuiPanel>
                        </EuiFlexItem>
                    </EuiFlexGroup> 

                    <EuiSpacer/>

                    <EuiFlexGroup justifyContent="spaceBetween">
                        <EuiFlexItem grow={5}>
                            <Table 
                                title="Meta-Alerts" 
                                button={
                                    <EuiFlexItem grow={false}>
                                        <EuiButton size="s" onClick={() => setIsFlyoutVisible(!isFlyoutVisible)}>
                                            {isFlyoutVisible ? 'Close graph' : 'Open graph'}
                                        </EuiButton>
                                    </EuiFlexItem>
                                }
                                notifications={notifications}
                                http={http}
                                url={url}
                                dates={dates}
                                size={querySize}
                                index={metaProps.index}
                                sort={metaProps.sort}
                                columns={metaColumns}
                                selection={metaSelection}
                                filters={metaFilters}
                            >
                            </Table>
                        </EuiFlexItem>
                        <EuiFlexItem grow={5}>
                            <Table 
                                title="Groups" 
                                notifications={notifications}
                                http={http}
                                url={url}
                                dates={dates}
                                size={querySize}
                                index={groupProps.index}
                                sort={groupProps.sort}
                                columns={groupColumns}
                                selection={groupSelection}
                                filters={groupFilters}
                            >
                            </Table>
                        </EuiFlexItem>
                        <EuiFlexItem grow={5}>
                            <Table 
                                title="Alerts" 
                                notifications={notifications}
                                http={http}
                                url={url}
                                dates={dates}
                                size={querySize}
                                index={alertProps.index}
                                sort={alertProps.sort}
                                columns={alertColumns}
                                selection={alertSelection}
                                filters={alertFilters}
                            >
                            </Table>
                        </EuiFlexItem>
                    </EuiFlexGroup>

                    {(isFlyoutVisible) &&
                        <EuiFlyout
                            size="m"
                            onClose={closeFlyout}
                            aria-labelledby="flyoutTitle">
                            <EuiFlyoutBody>
                                {(isGroupSelectable) && "Select Meta-Alerts"}
                                <Graph
                                    id="metas"
                                    data={graphData}
                                    config={graphConfig}
                                    onClickNode={onClickNode}
                                    onClickLink={onClickLink}
                                />
                            </EuiFlyoutBody>
                            <EuiFlyoutFooter>
                                <EuiFlexGroup justifyContent="spaceBetween">
                                    <EuiFlexItem grow={false}>
                                        <EuiButton 
                                            size="s"
                                            iconType="cross"
                                            onClick={closeFlyout}
                                            flush="left">
                                            Close
                                        </EuiButton >
                                    </EuiFlexItem>
                                </EuiFlexGroup>
                            </EuiFlyoutFooter>
                        </EuiFlyout>
                    }

                </div>        
            </I18nProvider>
        </Router>
    );
};

