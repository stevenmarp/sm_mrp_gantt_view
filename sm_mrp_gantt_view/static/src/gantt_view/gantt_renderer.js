/** @odoo-module **/

import { Component, onMounted, onPatched, onWillUnmount, useRef, useState } from "@odoo/owl";

const TASK_COLORS = [
    "#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED",
    "#0891B2", "#DB2777", "#4F46E5", "#0D9488", "#EA580C",
];

function loadSettings() {
    try {
        const raw = localStorage.getItem("sm_mrp_gantt_settings");
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveSettings(settings) {
    try {
        localStorage.setItem("sm_mrp_gantt_settings", JSON.stringify(settings));
    } catch {
    }
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value || "";
    return div.innerHTML;
}

function escapeCSV(value) {
    return `"${String(value || "").replace(/"/g, '""')}"`;
}

export class MrpGanttRenderer extends Component {
    static template = "sm_mrp_gantt_view.GanttRenderer";
    static props = ["model", "archInfo", "onTaskDoubleClick?"];

    setup() {
        this.ganttRef = useRef("gantt_container");
        this.dpCreated = false;
        this.eventsSet = false;
        this.dataProcessor = null;
        this.ganttEventIds = [];
        this.loadedDataVersion = null;
        this.todayMarkerId = null;
        this.groupColorMap = {};
        this.colorIdx = 0;

        const saved = loadSettings();
        this.state = useState({
            currentScale: saved.currentScale || "day",
            showGrid: saved.showGrid !== undefined ? saved.showGrid : true,
            showCriticalPath: false,
            fullscreen: false,
        });
        this.settings = {
            showTooltip: saved.showTooltip !== undefined ? saved.showTooltip : true,
            showProgressText: saved.showProgressText !== undefined ? saved.showProgressText : true,
            dynamicText: saved.dynamicText !== undefined ? saved.dynamicText : true,
            showWeekends: saved.showWeekends !== undefined ? saved.showWeekends : true,
            showLinks: saved.showLinks !== undefined ? saved.showLinks : true,
        };

        onMounted(() => this._renderGantt());
        onPatched(() => this._reloadChangedData());
        onWillUnmount(() => this._destroyGantt());
    }

    _persist() {
        saveSettings({
            currentScale: this.state.currentScale,
            showGrid: this.state.showGrid,
            showTooltip: this.settings.showTooltip,
            showProgressText: this.settings.showProgressText,
            dynamicText: this.settings.dynamicText,
            showWeekends: this.settings.showWeekends,
            showLinks: this.settings.showLinks,
        });
    }

    _getZoomConfig() {
        return {
            levels: [
                {
                    name: "hour",
                    scale_height: 50,
                    min_column_width: 35,
                    scales: [
                        { unit: "day", step: 1, format: "%d %M" },
                        { unit: "hour", step: 1, format: "%H:%i" },
                    ],
                },
                {
                    name: "day",
                    scale_height: 50,
                    min_column_width: 50,
                    scales: [
                        { unit: "month", step: 1, format: "%F %Y" },
                        { unit: "day", step: 1, format: "%d %D" },
                    ],
                },
                {
                    name: "week",
                    scale_height: 50,
                    min_column_width: 55,
                    scales: [
                        {
                            unit: "week",
                            step: 1,
                            format: (date) => {
                                const fmt = gantt.date.date_to_str("%d %M");
                                const end = gantt.date.add(date, 6, "day");
                                const wk = gantt.date.date_to_str("%W")(date);
                                return `W${wk}: ${fmt(date)} - ${fmt(end)}`;
                            },
                        },
                        { unit: "day", step: 1, format: "%j %D" },
                    ],
                },
                {
                    name: "month",
                    scale_height: 50,
                    min_column_width: 70,
                    scales: [
                        { unit: "year", step: 1, format: "%Y" },
                        { unit: "month", step: 1, format: "%M" },
                    ],
                },
                {
                    name: "quarter",
                    scale_height: 50,
                    min_column_width: 60,
                    scales: [
                        { unit: "year", step: 1, format: "%Y" },
                        {
                            unit: "quarter",
                            step: 1,
                            format: (date) => `Q${Math.floor(date.getMonth() / 3) + 1}`,
                        },
                        { unit: "month", step: 1, format: "%M" },
                    ],
                },
                {
                    name: "year",
                    scale_height: 50,
                    min_column_width: 80,
                    scales: [{ unit: "year", step: 1, format: "%Y" }],
                },
            ],
        };
    }

    _configureGantt() {
        const { durationLabel, durationShort, groupIcon, groupLabel } = this.props.archInfo;
        gantt.config.work_time = false;
        gantt.config.duration_unit = "hour";
        gantt.config.xml_date = "%Y-%m-%d %H:%i:%s";
        gantt.config.readonly = false;
        gantt.config.fit_tasks = true;
        gantt.config.auto_scheduling = false;
        gantt.config.show_links = this.settings.showLinks;
        gantt.config.show_grid = this.state.showGrid;
        gantt.config.row_height = 36;
        gantt.config.bar_height = 24;
        gantt.config.scale_height = 50;
        gantt.config.link_line_width = 2;
        gantt.config.link_arrow_size = 6;

        gantt.config.columns = [
            {
                name: "text",
                label: "Operation",
                tree: true,
                resize: true,
                width: 230,
                template: (task) => {
                    const text = escapeHTML(task.text);
                    if (task.isGroup) {
                        return `<span class="o_sm_mrp_gantt_group_name"><i class="${groupIcon} me-1"></i>${text}</span>`;
                    }
                    return `<span class="o_sm_mrp_gantt_task_cell">${this._getProgressDot(task.progress)}${text}</span>`;
                },
            },
            { name: "start_date", label: "Start", align: "center", resize: true, width: 110 },
            {
                name: "duration",
                label: durationLabel,
                align: "center",
                width: 70,
                template: (task) => task.isGroup ? "" : `${Math.round(task.duration || 0)}${durationShort}`,
            },
            {
                name: "progress",
                label: "%",
                align: "center",
                width: 55,
                template: (task) => {
                    if (task.isGroup) {
                        return "";
                    }
                    return `<span class="o_sm_mrp_gantt_pct">${Math.round((task.progress || 0) * 100)}%</span>`;
                },
            },
        ];

        gantt.templates.task_text = (start, end, task) => {
            const text = escapeHTML(task.text);
            if (task.isGroup) {
                return `<b>${text}</b>`;
            }
            if (!this.settings.dynamicText && !this.settings.showProgressText) {
                return "";
            }
            const parts = [];
            if (this.settings.dynamicText) {
                parts.push(text);
            }
            if (this.settings.showProgressText) {
                parts.push(`${Math.round((task.progress || 0) * 100)}%`);
            }
            return parts.join(" - ");
        };

        gantt.templates.task_class = (start, end, task) => {
            const classes = [];
            if (task.isGroup) {
                classes.push("o_sm_mrp_gantt_group_bar");
            }
            const pct = (task.progress || 0) * 100;
            if (pct >= 100) {
                classes.push("o_sm_mrp_gantt_complete");
            } else if (pct > 0) {
                classes.push("o_sm_mrp_gantt_in_progress");
            } else {
                classes.push("o_sm_mrp_gantt_not_started");
            }
            return classes.join(" ");
        };

        gantt.templates.task_row_class = (start, end, task) => task.$index % 2 === 0 ? "o_sm_mrp_gantt_row_even" : "o_sm_mrp_gantt_row_odd";
        gantt.templates.grid_row_class = (start, end, task) => task.isGroup ? "o_sm_mrp_gantt_grid_group_row" : "";
        gantt.templates.scale_cell_class = (date) => this.settings.showWeekends && (date.getDay() === 0 || date.getDay() === 6) ? "o_sm_mrp_gantt_weekend_header" : "";
        gantt.templates.timeline_cell_class = (task, date) => this.settings.showWeekends && (date.getDay() === 0 || date.getDay() === 6) ? "o_sm_mrp_gantt_weekend_cell" : "";
        gantt.templates.link_class = (link) => this.state.showCriticalPath && link._isCritical ? "o_sm_mrp_gantt_critical_link" : "";

        if (this.settings.showTooltip) {
            gantt.templates.tooltip_text = (start, end, task) => {
                const text = escapeHTML(task.text);
                if (task.isGroup) {
                    return `<div class="o_sm_mrp_gantt_tooltip"><div class="o_sm_mrp_gantt_tooltip_title">${groupLabel}: ${text}</div></div>`;
                }
                const fmt = gantt.date.date_to_str("%b %d, %Y %H:%i");
                const pct = Math.round((task.progress || 0) * 100);
                return `<div class="o_sm_mrp_gantt_tooltip">
                    <div class="o_sm_mrp_gantt_tooltip_title">${text}</div>
                    <div class="o_sm_mrp_gantt_tooltip_row"><span>Start:</span> ${fmt(start)}</div>
                    <div class="o_sm_mrp_gantt_tooltip_row"><span>End:</span> ${fmt(end)}</div>
                    <div class="o_sm_mrp_gantt_tooltip_row"><span>Duration:</span> ${Math.round(task.duration || 0)} ${durationShort}</div>
                    <div class="o_sm_mrp_gantt_tooltip_row"><span>Progress:</span> ${pct}%</div>
                    <div class="o_sm_mrp_gantt_tooltip_row"><span>${groupLabel}:</span> ${escapeHTML(task.groupName || "")}</div>
                </div>`;
            };
            gantt.config.tooltip_offset_x = 10;
            gantt.config.tooltip_offset_y = 20;
        } else {
            gantt.templates.tooltip_text = () => "";
        }

        gantt.ext.zoom.init(this._getZoomConfig());
        gantt.ext.zoom.setLevel(this.state.currentScale);
    }

    _getProgressDot(progress) {
        const pct = (progress || 0) * 100;
        let cls = "o_sm_dot_red";
        if (pct >= 100) {
            cls = "o_sm_dot_green";
        } else if (pct > 0) {
            cls = "o_sm_dot_yellow";
        }
        return `<span class="o_sm_mrp_gantt_dot ${cls}"></span>`;
    }

    _getGroupColor(groupId) {
        if (!this.groupColorMap[groupId]) {
            this.groupColorMap[groupId] = TASK_COLORS[this.colorIdx % TASK_COLORS.length];
            this.colorIdx++;
        }
        return this.groupColorMap[groupId];
    }

    _renderGantt() {
        if (!this.ganttRef.el) {
            return;
        }
        this._configureGantt();
        gantt.init(this.ganttRef.el);
        this._setupDataProcessor();
        this._setupEvents();
        this._loadData();
    }

    _loadData() {
        gantt.clearAll();
        this.loadedDataVersion = this.props.model.dataVersion;

        if (this.todayMarkerId) {
            gantt.deleteMarker(this.todayMarkerId);
        }
        const fmt = gantt.date.date_to_str("%b %d, %Y");
        this.todayMarkerId = gantt.addMarker({
            start_date: new Date(),
            css: "o_sm_mrp_gantt_today_marker",
            text: "Today",
            title: fmt(new Date()),
        });

        const { ganttData } = this.props.model;
        if (ganttData && ganttData.data.length) {
            for (const task of ganttData.data) {
                if (!task.isGroup && task.parent) {
                    const gid = String(task.parent).replace("group-", "");
                    task.color = this._getGroupColor(gid);
                }
                if (task.isGroup) {
                    task.color = this._getGroupColor(task.serverId || task.id);
                }
            }
            gantt.parse(ganttData);
        }

        if (this.state.showCriticalPath) {
            this._highlightCriticalPath();
        }
    }

    _setupDataProcessor() {
        if (this.dpCreated) {
            return;
        }
        this.dpCreated = true;
        const model = this.props.model;
        const archInfo = this.props.archInfo;

        this.dataProcessor = gantt.createDataProcessor((entity, action, data) => {
            if (entity === "task" && action === "update") {
                if (data.isGroup) {
                    return Promise.resolve();
                }
                const values = {};
                values[archInfo.text] = data.text;
                values[archInfo.duration] = Math.max(Math.round((data.duration || 1) * 100) / 100, 1);

                if (data.start_date) {
                    const startDate = typeof data.start_date === "string"
                        ? gantt.date.str_to_date("%d-%m-%Y %H:%i")(data.start_date)
                        : data.start_date;
                    const pad = (n) => String(n).padStart(2, "0");
                    values[archInfo.dateStart] = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())} ${pad(startDate.getHours())}:${pad(startDate.getMinutes())}:${pad(startDate.getSeconds())}`;
                }

                return model.updateTask(data.id, values);
            }

            if (entity === "link" && action === "create") {
                return model.createLink({
                    source: data.source,
                    target: data.target,
                    type: data.type || "0",
                }).then((newId) => ({ tid: newId }));
            }

            if (entity === "link" && action === "delete") {
                return model.deleteLink(data.id);
            }

            return Promise.resolve();
        });
    }

    _setupEvents() {
        if (this.eventsSet) {
            return;
        }
        this.eventsSet = true;

        this._attachGanttEvent("onBeforeGanttRender", () => {
            if (!this.ganttRef.el) {
                return;
            }
            const root = this.ganttRef.el.closest(".o_sm_mrp_gantt_root");
            if (root) {
                const toolbar = root.querySelector(".o_sm_mrp_gantt_toolbar");
                const rootH = root.clientHeight;
                const toolH = toolbar ? toolbar.clientHeight : 0;
                this.ganttRef.el.style.height = `${rootH - toolH}px`;
            }
        });

        this._attachGanttEvent("onBeforeLightbox", (id) => {
            const task = gantt.getTask(id);
            if (this.props.onTaskDoubleClick) {
                this.props.onTaskDoubleClick(task);
            }
            return false;
        });

        this._attachGanttEvent("onBeforeTaskDrag", (id) => !gantt.getTask(id).isGroup);
        this._attachGanttEvent("onBeforeLinkAdd", (id, link) => {
            const source = gantt.getTask(link.source);
            const target = gantt.getTask(link.target);
            return !source.isGroup && !target.isGroup && source.id !== target.id;
        });
        this._attachGanttEvent("onAfterTaskDrag", () => gantt.render());
    }

    _destroyGantt() {
        for (const eventId of this.ganttEventIds) {
            gantt.detachEvent(eventId);
        }
        this.ganttEventIds = [];
        if (this.dataProcessor && this.dataProcessor.destructor) {
            this.dataProcessor.destructor();
            this.dataProcessor = null;
        }
        if (this.todayMarkerId) {
            gantt.deleteMarker(this.todayMarkerId);
            this.todayMarkerId = null;
        }
        gantt.clearAll();
    }

    _attachGanttEvent(name, handler) {
        this.ganttEventIds.push(gantt.attachEvent(name, handler));
    }

    _reloadChangedData() {
        if (this.loadedDataVersion !== this.props.model.dataVersion) {
            this._loadData();
        }
    }

    getScaleButtons() {
        return [
            { name: "hour", label: "Hour" },
            { name: "day", label: "Day" },
            { name: "week", label: "Week" },
            { name: "month", label: "Month" },
            { name: "quarter", label: "Quarter" },
            { name: "year", label: "Year" },
        ];
    }

    onScaleChange(scale) {
        this.state.currentScale = scale;
        gantt.ext.zoom.setLevel(scale);
        this._persist();
    }

    onPrev() {
        const scale = this.state.currentScale;
        const unit = scale === "quarter" ? "month" : scale;
        const step = scale === "quarter" ? 3 : 1;
        const sd = gantt.getState().min_date;
        gantt.scrollTo(gantt.posFromDate(gantt.date.add(sd, -step, unit)));
    }

    onNext() {
        const scale = this.state.currentScale;
        const unit = scale === "quarter" ? "month" : scale;
        const step = scale === "quarter" ? 3 : 1;
        const sd = gantt.getState().min_date;
        gantt.scrollTo(gantt.posFromDate(gantt.date.add(sd, step, unit)));
    }

    onToday() {
        gantt.showDate(new Date());
    }

    onToggleGrid() {
        this.state.showGrid = !this.state.showGrid;
        gantt.config.show_grid = this.state.showGrid;
        gantt.render();
        this._persist();
    }

    onToggleCriticalPath() {
        this.state.showCriticalPath = !this.state.showCriticalPath;
        if (this.state.showCriticalPath) {
            this._highlightCriticalPath();
        }
        gantt.render();
    }

    onZoomToFit() {
        if (!gantt.getTaskCount()) {
            return;
        }
        let minDate = null;
        let maxDate = null;
        gantt.eachTask((task) => {
            if (task.start_date && (!minDate || task.start_date < minDate)) {
                minDate = new Date(task.start_date);
            }
            const end = task.end_date || gantt.date.add(task.start_date, task.duration || 1, "hour");
            if (!maxDate || end > maxDate) {
                maxDate = new Date(end);
            }
        });
        if (minDate && maxDate) {
            gantt.config.start_date = gantt.date.add(minDate, -12, "hour");
            gantt.config.end_date = gantt.date.add(maxDate, 12, "hour");
            gantt.config.fit_tasks = true;
            gantt.render();
            delete gantt.config.start_date;
            delete gantt.config.end_date;
        }
    }

    onToggleFullscreen() {
        this.state.fullscreen = !this.state.fullscreen;
    }

    onSort(mode) {
        const sortMap = {
            name_asc: { field: "text", dir: "asc" },
            name_desc: { field: "text", dir: "desc" },
            date_asc: { field: "start_date", dir: "asc" },
            date_desc: { field: "start_date", dir: "desc" },
            progress_asc: { field: "progress", dir: "asc" },
            progress_desc: { field: "progress", dir: "desc" },
        };
        const s = sortMap[mode];
        if (s) {
            gantt.sort(s.field, s.dir === "desc");
        }
    }

    _safeRender() {
        requestAnimationFrame(() => {
            try {
                gantt.render();
            } catch {
            }
        });
    }

    onToggleTooltip() {
        this.settings.showTooltip = !this.settings.showTooltip;
        this._persist();
        requestAnimationFrame(() => {
            try {
                this._configureGantt();
                gantt.render();
            } catch {
            }
        });
    }

    onToggleProgressText() {
        this.settings.showProgressText = !this.settings.showProgressText;
        this._persist();
        this._safeRender();
    }

    onToggleDynamicText() {
        this.settings.dynamicText = !this.settings.dynamicText;
        this._persist();
        this._safeRender();
    }

    onToggleWeekends() {
        this.settings.showWeekends = !this.settings.showWeekends;
        this._persist();
        this._safeRender();
    }

    onToggleLinks() {
        this.settings.showLinks = !this.settings.showLinks;
        gantt.config.show_links = this.settings.showLinks;
        this._persist();
        this._safeRender();
    }

    async onExportSVG() {
        const container = this.ganttRef.el;
        if (!container) {
            return;
        }
        try {
            const width = container.scrollWidth;
            const height = container.scrollHeight;
            const clone = container.cloneNode(true);
            clone.style.width = `${width}px`;
            clone.style.height = `${height}px`;
            const data = new XMLSerializer().serializeToString(clone);
            const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${data}</div></foreignObject></svg>`;
            const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "manufacturing_gantt.svg";
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.warn("SVG export failed, falling back to CSV:", e);
            this.onExportExcel();
        }
    }

    onExportExcel() {
        const tasks = [];
        gantt.eachTask((task) => {
            if (task.isGroup) {
                return;
            }
            const fmt = gantt.date.date_to_str("%Y-%m-%d %H:%i");
            tasks.push({
                name: task.text,
                start: task.start_date ? fmt(task.start_date) : "",
                end: task.end_date ? fmt(task.end_date) : "",
                duration: Math.round(task.duration || 0),
                progress: Math.round((task.progress || 0) * 100),
                group: task.groupName || "",
            });
        });

        let csv = `Operation,Start,End,Duration (${this.props.archInfo.durationShort}),Progress (%),${this.props.archInfo.groupLabel}\n`;
        for (const t of tasks) {
            csv += `${escapeCSV(t.name)},${escapeCSV(t.start)},${escapeCSV(t.end)},${t.duration},${t.progress},${escapeCSV(t.group)}\n`;
        }
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "manufacturing_gantt.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    _highlightCriticalPath() {
        try {
            gantt.eachTask((task) => {
                task._isCritical = false;
            });
            const links = gantt.getLinks();
            if (!links.length) {
                return;
            }
            const taskEnds = {};
            gantt.eachTask((task) => {
                if (!task.isGroup && task.end_date) {
                    taskEnds[task.id] = task.end_date.getTime();
                }
            });
            let latestId = null;
            let latestEnd = 0;
            for (const [id, end] of Object.entries(taskEnds)) {
                if (end > latestEnd) {
                    latestEnd = end;
                    latestId = id;
                }
            }
            if (!latestId) {
                return;
            }
            const visited = new Set();
            const queue = [latestId];
            while (queue.length) {
                const current = queue.shift();
                if (visited.has(current)) {
                    continue;
                }
                visited.add(current);
                const task = gantt.getTask(current);
                task._isCritical = true;
                for (const link of links) {
                    if (String(link.target) === String(current)) {
                        link._isCritical = true;
                        queue.push(link.source);
                    }
                }
            }
        } catch {
        }
    }
}
