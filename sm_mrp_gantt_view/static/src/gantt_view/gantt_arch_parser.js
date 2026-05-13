/** @odoo-module **/

import { visitXML } from "@web/core/utils/xml";

export class MrpGanttArchParser {
    parse(arch) {
        const archInfo = {};
        visitXML(arch, (node) => {
            if (node.tagName === "sm_mrp_gantt") {
                archInfo.dateStart = node.getAttribute("date_start") || "date_start";
                archInfo.duration = node.getAttribute("duration") || "sm_gantt_duration_hours";
                archInfo.durationLabel = node.getAttribute("duration_label") || "Hours";
                archInfo.durationShort = node.getAttribute("duration_short") || "h";
                archInfo.text = node.getAttribute("text") || "name";
                archInfo.progress = node.getAttribute("progress") || "progress";
                archInfo.open = node.getAttribute("open") || "sm_gantt_open";
                archInfo.linksJson = node.getAttribute("links_serialized_json") || "sm_gantt_links_json";
                archInfo.linkCreateMethod = node.getAttribute("link_create_method") || "sm_gantt_create_link";
                archInfo.linkDeleteMethod = node.getAttribute("link_delete_method") || "sm_gantt_delete_link";
                archInfo.idField = node.getAttribute("id_field") || "id";
                archInfo.totalFloat = node.getAttribute("total_float") || "";
                archInfo.groupField = node.getAttribute("group_field") || "workcenter_id";
                archInfo.groupLabel = node.getAttribute("group_label") || "Work Center";
                archInfo.groupResModel = node.getAttribute("group_res_model") || "mrp.workcenter";
                archInfo.groupIcon = node.getAttribute("group_icon") || "fa fa-industry";
            }
        });
        return archInfo;
    }
}
