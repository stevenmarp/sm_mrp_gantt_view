/** @odoo-module **/

import { Model } from "@web/model/model";
import { rpc } from "@web/core/network/rpc";
import { KeepLast } from "@web/core/utils/concurrency";

export class MrpGanttModel extends Model {
    static services = ["orm"];

    setup(params) {
        super.setup(params);
        this.metaData = params;
        this.ganttData = { data: [], links: [] };
        this.dataVersion = 0;
        this.keepLast = new KeepLast();
    }

    async load(searchParams) {
        this.searchParams = searchParams;
        await this.keepLast.add(this._fetchData());
        if (this.isReady) {
            this.notify();
        }
    }

    hasData() {
        return this.ganttData.data.length > 0;
    }

    async _fetchData() {
        const { dateStart, duration, text, progress, open, linksJson, groupField } = this.metaData;
        const fieldNames = [text, dateStart, duration, progress, open, linksJson, groupField].filter(Boolean);
        const domain = (this.searchParams && this.searchParams.domain) || [];
        const records = await this.orm.searchRead(
            this.metaData.resModel,
            domain,
            fieldNames,
            { order: `${dateStart} asc` }
        );
        this._convertData(records);
    }

    _parseOdooDate(value) {
        if (!value || typeof value !== "string") {
            return value || new Date();
        }
        const parts = value.split(/[- :T]/);
        return new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
            parseInt(parts[3] || 0),
            parseInt(parts[4] || 0),
            parseInt(parts[5] || 0)
        );
    }

    _convertData(records) {
        const { dateStart, duration, text, progress, open, linksJson, groupField, groupResModel } = this.metaData;
        const data = [];
        const links = [];
        const groupMap = {};

        for (const record of records) {
            const groupValue = record[groupField];
            if (groupValue && Array.isArray(groupValue)) {
                const groupKey = groupValue[0];
                if (!groupMap[groupKey]) {
                    const groupId = `group-${groupKey}`;
                    groupMap[groupKey] = groupId;
                    data.push({
                        id: groupId,
                        serverId: groupKey,
                        text: groupValue[1],
                        isGroup: true,
                        groupModel: groupResModel,
                        open: true,
                    });
                }
            }

            const task = {
                id: record.id,
                text: record[text] || "",
                start_date: this._parseOdooDate(record[dateStart]),
                duration: record[duration] || 1,
                progress: (record[progress] || 0) / 100.0,
                open: record[open] !== undefined ? record[open] : true,
                groupName: groupValue && Array.isArray(groupValue) ? groupValue[1] : "",
            };

            if (groupValue && Array.isArray(groupValue) && groupMap[groupValue[0]]) {
                task.parent = groupMap[groupValue[0]];
                task.groupServerId = groupValue[0];
            }

            data.push(task);

            const linksData = record[linksJson];
            if (linksData) {
                try {
                    links.push(...JSON.parse(linksData));
                } catch {
                }
            }
        }

        const seen = new Set();
        const uniqueLinks = [];
        for (const link of links) {
            if (!seen.has(link.id)) {
                seen.add(link.id);
                uniqueLinks.push(link);
            }
        }

        this.ganttData = { data, links: uniqueLinks };
        this.dataVersion++;
    }

    async updateTask(taskId, values) {
        await rpc("/web/dataset/call_kw", {
            model: this.metaData.resModel,
            method: "write",
            args: [[taskId], values],
            kwargs: {},
        });
    }

    async createLink(values) {
        return rpc("/web/dataset/call_kw", {
            model: this.metaData.resModel,
            method: this.metaData.linkCreateMethod,
            args: [values.source, values.target, values.type],
            kwargs: {},
        });
    }

    async deleteLink(linkId) {
        await rpc("/web/dataset/call_kw", {
            model: this.metaData.resModel,
            method: this.metaData.linkDeleteMethod,
            args: [linkId],
            kwargs: {},
        });
    }
}
