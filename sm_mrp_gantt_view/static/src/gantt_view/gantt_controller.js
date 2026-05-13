/** @odoo-module **/

import { Layout } from "@web/search/layout";
import { useModel } from "@web/model/model";
import { standardViewProps } from "@web/views/standard_view_props";
import { useSetupAction } from "@web/search/action_hook";
import { SearchBar } from "@web/search/search_bar/search_bar";
import { useSearchBarToggler } from "@web/search/search_bar/search_bar_toggler";
import { CogMenu } from "@web/search/cog_menu/cog_menu";
import { useBus, useService } from "@web/core/utils/hooks";

import { Component, useRef } from "@odoo/owl";

export class MrpGanttController extends Component {
    static template = "sm_mrp_gantt_view.GanttView";
    static components = { Layout, SearchBar, CogMenu };
    static props = {
        ...standardViewProps,
        Model: Function,
        modelParams: Object,
        Renderer: Function,
        archInfo: Object,
    };

    setup() {
        this.actionService = useService("action");
        this.model = useModel(this.props.Model, this.props.modelParams);
        useBus(this.model.bus, "update", () => this.render(true));
        useSetupAction({ rootRef: useRef("root") });
        this.searchBarToggler = useSearchBarToggler();
    }

    onTaskDoubleClick(task) {
        const resModel = task.isGroup ? task.groupModel : this.props.resModel;
        const resId = task.isGroup ? task.serverId : task.id;
        if (typeof resId !== "number") {
            return;
        }
        this.actionService.doAction({
            type: "ir.actions.act_window",
            res_model: resModel,
            res_id: resId,
            views: [[false, "form"]],
            target: "current",
        });
    }
}
