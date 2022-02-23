import React from 'react';
import {
    EuiTitle, EuiBasicTable, EuiPanel, EuiSpacer, EuiButton, EuiTextColor, EuiFlexGroup, EuiFlexItem
} from '@elastic/eui';


class Table extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        hits: [],     
        total: 0,                
        searchAfter: [Date.now()],
      }
    }

    componentDidMount() {
    }

    componentDidUpdate(prevProps, prevState) {
        if ((this.props.dates !== prevProps.dates) || (this.props.filters !== prevProps.filters)) {
            this.fetchData(false);
        };
    }

    async fetchData (append) {
        let flts = [
            {
                'range': {
                    '@timestamp': {
                        'gte': this.props.dates.from, 
                        'lte': this.props.dates.to
                    }
                }
            }
        ];

        if (this.props.filters && (Object.keys(this.props.filters).length !== 0)) {
            for (const [k, v] of Object.entries(this.props.filters)) {
                flts.push({terms: {[k]: v}});
            };
        };
        
        await this.props.http.get(this.props.url, {
            query: {
                body: JSON.stringify({
                    index: this.props.index,
                    size: this.props.size,
                    sort: this.props.sort,
                    body: {
                        search_after: this.state.searchAfter,
                        aggs: this.props.aggs,
                        query: {'bool': { 'filter': flts}}
                    }
                })
            }
        }).then((resp) => {
            let hits = resp.data.hits.hits;
            let total = resp.data.hits.total.value;
            let aggregations = resp.data.aggregations;
            if (append) {
                hits = this.state.hits.concat(hits);
            };

            if (aggregations && aggregations.hits_over_time) {
                const buckets = aggregations.hits_over_time.buckets;
                const chdata = buckets.map(bucket => 
                    [bucket.key, bucket.doc_count]
                );
                if (this.props.handleChartData) {
                    this.props.handleChartData(chdata)
                };
            };

            this.setState({
                hits: hits, 
                total: total,
                searchAfter: [Date.now()]
            });
            
            if (this.props.handleNodes) {
                this.props.handleNodes(hits);
            };
        }).catch((error) => {
            this.props.notifications.toasts.addDanger({
                title: 'Query result',
                text: 'An error has occurred when calling the backend',
            });
        });
    }

    fetchMore = () => {
        if (this.state.hits && this.state.hits.length) {
            const [ lastHit ] = this.state.hits.slice(-1);
            this.setState({searchAfter: lastHit['sort']}, () => {
                this.fetchData(true);
            });
        };
    }

    render() {
        return (
            <div>
                <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                        <EuiTitle size="s">
                            <h4>
                                {this.props.title}
                                <EuiTextColor color="subdued" style={{ "fontSize": "16px", "marginLeft": "8px" }}> 
                                    { (this.state.hits.length) && this.state.hits.length + " of " + this.state.total}
                                    { (this.state.hits && this.total==10000) && "+"}
                                </EuiTextColor>
                            </h4>
                        </EuiTitle>
                    </EuiFlexItem>
                    {(this.props.button) && this.props.button}
                </EuiFlexGroup>

                <EuiSpacer size="s" />

                <EuiPanel style={{ "overflowY": "scroll", height: "580px" }}>
                    <EuiBasicTable
                        columns={this.props.columns} 
                        items={this.state.hits}                          
                        isSelectable={true}
                        selection={this.props.selection}
                        itemId="_id"
                    />
                    <EuiSpacer />
                        {(this.state.total > this.state.hits.length) &&  
                            <EuiButton fill fullWidth={true} onClick={() => this.fetchMore()}>
                                Load more
                            </EuiButton>
                        }
                    <EuiSpacer />
                </EuiPanel>
            </div>
        )
    }
};

export default Table;