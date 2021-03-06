import React, {useEffect, useState} from "react";
import {Button, Card, Col, Descriptions, Form, Modal, Popover, Row, Space, Table, Tag, Typography} from "antd";
import {PaginationSchema, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema";
import {failed} from "../../utils/notification";
import {PortAsset} from "./models";
import {CopyableField, InputItem} from "../../utils/inputUtil";
import {formatTimestamp} from "../../utils/timeUtil";
import {HTTPFlow, TableFilterDropdownForm} from "../../components/HTTPFlowTable";
import {SearchOutlined, ReloadOutlined} from "@ant-design/icons";
import {SorterResult} from "antd/lib/table/interface";
import {YakEditor} from "../../utils/editors";
import {openExternalWebsite} from "../../utils/openWebsite";

const {ipcRenderer} = window.require("electron");

export interface PortAssetTableProp {
    closed?: boolean
    onClicked?: (i: PortAsset) => any,
}

export interface QueryPortsRequest extends QueryGeneralRequest {
    Hosts: string
    Ports: string
    State: "open" | "closed" | "unknown"
    Service: string
}

export const PortAssetTable: React.FC<PortAssetTableProp> = (props) => {
    const [response, setResponse] = useState<QueryGeneralResponse<PortAsset>>({
        Data: [], Pagination: {
            Limit: 15, Page: 1, OrderBy: "desc", Order: "updated_at",
        } as PaginationSchema, Total: 0
    });
    const [params, setParams] = useState<QueryPortsRequest>({
        Hosts: "", Ports: "", Service: "", State: props.closed ? "closed" : "open", Pagination: {
            Limit: 15, Page: 1, OrderBy: "desc", Order: "updated_at",
        },
    });
    const [loading, setLoading] = useState(false);

    const update = (current?: number, pageSize?: number, order?: string, orderBy?: string) => {
        setLoading(true)
        ipcRenderer.invoke("QueryPorts", {
            ...params,
            Pagination: {
                Limit: pageSize || response.Pagination.Limit,
                Page: current || response.Pagination.Page,
                Order: order || "desc",
                OrderBy: orderBy || "updated_at"
            }
        }).then(data => {
            setResponse(data)
        }).catch((e: any) => {
            failed("QueryPorts failed: " + `${e}`)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }

    useEffect(() => {
        update()
    }, [])

    return <Table<PortAsset>
        title={() => {
            return <Row>
                <Col span={12}>
                    <Space>
                        ?????????????????? <Button
                        icon={<ReloadOutlined/>} size={"small"} type={"link"}
                        onClick={() => {
                            update(1)
                        }}
                    />
                    </Space>
                </Col>
                <Col span={12} style={{textAlign: "right"}}>
                    <Popover
                        title={"?????????????????????"}
                        content={<PortDeleteForm onFinished={() => update(1)}/>}
                    >
                        <Button size={"small"} danger={true}>????????????</Button>
                    </Popover>
                </Col>
            </Row>
        }}
        scroll={{x: "auto"}}
        size={"small"}
        bordered={true}
        rowKey={(row) => row.Id}
        onRow={r => {
            return {
                onClick: e => {
                    // props.onClicked && props.onClicked(r)
                },
            }
        }}
        expandable={{
            expandedRowRender: record => <PortAssetDescription port={record}/>,
        }}
        loading={loading}
        columns={props.closed ? [
            {
                title: "????????????",
                render: (i: PortAsset) => <CopyableField text={`${i.Host}:${i.Port}`}/>,
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return params && setParams && <TableFilterDropdownForm
                        label={"??????IP/??????"} params={params} setParams={setParams}
                        filterName={"Hosts"} pureString={true}
                        confirm={confirm} setSelectedKeys={setSelectedKeys}
                    />
                }, width: 200,
                filterIcon: filtered => {
                    return params && !!setParams && <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}}/>
                },
            },
            {
                title: "??????", width: 70,
                render: (i: PortAsset) => <Tag color={"geekblue"}>{i.Port}</Tag>,
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return params && setParams && <TableFilterDropdownForm
                        label={"????????????"} params={params} setParams={setParams}
                        filterName={"Ports"} autoCompletions={[]} pureString={true}
                        confirm={confirm} setSelectedKeys={setSelectedKeys}
                    />
                },
                filterIcon: filtered => {
                    return params && !!setParams && <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}}/>
                },
            },
            {
                title: "????????????",
                render: (i: PortAsset) => i.ServiceType ? <div style={{width: 230, overflow: "auto"}}><CopyableField
                    text={i.Reason}/></div> : "", width: 250,
            },
        ] : [
            {
                title: "????????????",
                render: (i: PortAsset) => <CopyableField text={`${i.Host}:${i.Port}`}/>,
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return params && setParams && <TableFilterDropdownForm
                        label={"??????IP/??????"} params={params} setParams={setParams}
                        filterName={"Hosts"} pureString={true}
                        confirm={confirm} setSelectedKeys={setSelectedKeys}
                    />
                }, width: 200,
                filterIcon: filtered => {
                    return params && !!setParams && <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}}/>
                },
            },
            {
                title: "??????", width: 70,
                render: (i: PortAsset) => <Tag color={"geekblue"}>{i.Port}</Tag>,
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return params && setParams && <TableFilterDropdownForm
                        label={"????????????"} params={params} setParams={setParams}
                        filterName={"Ports"} autoCompletions={[]} pureString={true}
                        confirm={confirm} setSelectedKeys={setSelectedKeys}
                    />
                },
                filterIcon: filtered => {
                    return params && !!setParams && <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}}/>
                },
            },
            {
                title: "??????", width: 57,
                render: (i: PortAsset) => <Tag color={"green"}>{i.Proto}</Tag>,
            },
            {
                title: "????????????",
                render: (i: PortAsset) => i.ServiceType ? <div style={{width: 230, overflowX: 'hidden'}}><CopyableField
                    noCopy={true}
                    text={i.ServiceType}/></div> : "", width: 250,
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return params && setParams && <TableFilterDropdownForm
                        label={"???????????????"} params={params} setParams={setParams}
                        filterName={"Service"} autoCompletions={[]} pureString={true}
                        confirm={confirm} setSelectedKeys={setSelectedKeys}
                    />
                },
                filterIcon: filtered => {
                    return params && !!setParams && <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}}/>
                },
            },
            {
                title: "Title",
                render: (i: PortAsset) => i.ServiceType ? <div style={{width: 150, overflow: "auto"}}><CopyableField
                    noCopy={true}
                    text={i.HtmlTitle}/></div> : "", width: 170,
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return params && setParams && <TableFilterDropdownForm
                        label={"Html Title"} params={params} setParams={setParams}
                        filterName={"Title"} autoCompletions={[]} pureString={true}
                        confirm={confirm} setSelectedKeys={setSelectedKeys}
                    />
                },
                filterIcon: filtered => {
                    return params && !!setParams && <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}}/>
                },
            },
            {title: "??????????????????", render: (i: PortAsset) => <Tag color={"green"}>{formatTimestamp(i.UpdatedAt)}</Tag>},
            {
                title: "??????", render: (i: PortAsset) => <Button
                    size={"small"} type={"link"}
                    onClick={e => {
                        openExternalWebsite(`http://${i.Host}:${i.Port}`)
                    }}>???????????????</Button>, fixed: "right",
            },
        ]}
        dataSource={response.Data}
        pagination={{
            size: "small",
            pageSize: response.Pagination?.Limit || 10,
            total: response.Total, showTotal: (i) => <Tag>???{i}?????????</Tag>,
            showSizeChanger: true, showLessItems: true,
        }}
        // @ts-ignore*/
        onChange={(paging: any, _: any, sorter: SorterResult<HTTPFlow>) => {
            if (sorter.order && sorter.columnKey) {
                update(paging.current, paging.pageSize, sorter.order, `${sorter.columnKey}`)
            } else {
                update(paging.current, paging.pageSize)
            }
        }}
    >

    </Table>
};

export interface PortAssetDescriptionProp {
    port: PortAsset
}

export const PortAssetDescription: React.FC<PortAssetDescriptionProp> = (props) => {
    const {port} = props;
    return <Descriptions size={"small"} bordered={true} column={!port.ServiceType ? 1 : 2} title={''}
                         style={{marginLeft: 20}}>
        <Descriptions.Item label={<Tag>??????</Tag>}><CopyableField
            text={`${port.State}`}/></Descriptions.Item>
        {port.HtmlTitle && <Descriptions.Item label={<Tag>Title</Tag>}><CopyableField
            text={`${port.HtmlTitle}`}/></Descriptions.Item>}
        {port.ServiceType && <Descriptions.Item span={2} label={<Tag>??????</Tag>}><CopyableField
            text={`${port.ServiceType}`}/></Descriptions.Item>}
        {port.Reason && <Descriptions.Item span={2} label={<Tag>????????????</Tag>}><CopyableField
            text={`${port.Reason}`}/></Descriptions.Item>}
        {port.CPE.join("|") !== "" ? <Descriptions.Item span={2} label={<Tag>CPE</Tag>}>
            <Space direction={"vertical"}>
                {port.CPE.map(e => {
                    return <CopyableField
                        text={`${e}`}
                    />
                })}
            </Space>
        </Descriptions.Item> : undefined}
        {port.Fingerprint && <Descriptions.Item span={2} label={<Tag>????????????</Tag>}>
            <div style={{height: 200}}>
                <YakEditor value={port.Fingerprint} noLineNumber={true} noMiniMap={true}/>
            </div>
        </Descriptions.Item>}
    </Descriptions>
};


export interface PortDeleteFormProp {
    onFinished: () => any
}

interface DeletePortRequest {
    Hosts: string
    Ports: string
}

export const PortDeleteForm: React.FC<PortDeleteFormProp> = (props) => {
    const [params, setParams] = useState<DeletePortRequest>({
        Hosts: "", Ports: "",
    });

    return <Form onClickCapture={e => {
        e.preventDefault()
        ipcRenderer.invoke("DeletePorts", {All: false, ...params}).then(() => {

        }).catch((e: any) => {
            failed("????????????")
        }).finally(() => {
            props.onFinished()
        })
    }} layout={"vertical"} size={"small"}>
        <InputItem label={"?????????????????????/IP"} setValue={Hosts => setParams({...params, Hosts})} value={params.Hosts}/>
        <InputItem label={"????????????????????????"} setValue={Ports => setParams({...params, Ports})} value={params.Ports}/>
        <Form.Item>
            <Button type="primary" htmlType="submit" danger={true}> ?????????????????? </Button>
            <Button type="dashed" danger={true} onClick={() => {
                Modal.confirm({
                    title: "???????????????????????????????????????", onOk: () => {
                        ipcRenderer.invoke("DeletePorts", {All: true}).then(() => {

                        }).catch((e: any) => {
                            failed("????????????")
                        }).finally(() => {
                            props.onFinished()
                        })
                    }
                })
            }}> ???????????? </Button>
        </Form.Item>
    </Form>
};