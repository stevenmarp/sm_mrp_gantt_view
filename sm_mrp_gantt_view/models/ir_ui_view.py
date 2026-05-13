# -*- coding: utf-8 -*-

from lxml import etree

from odoo import _, fields, models

SM_MRP_GANTT_VALID_ATTRIBUTES = {
    '__validate__',
    'class',
    'create',
    'date_start',
    'delete',
    'duration',
    'duration_label',
    'duration_short',
    'edit',
    'group_field',
    'group_icon',
    'group_label',
    'group_res_model',
    'groups',
    'id_field',
    'js_class',
    'link_create_method',
    'link_delete_method',
    'links_serialized_json',
    'open',
    'progress',
    'string',
    'text',
    'total_float',
}


class IrUiView(models.Model):
    _inherit = 'ir.ui.view'

    type = fields.Selection(
        selection_add=[('sm_mrp_gantt', 'SM MRP Gantt')],
        ondelete={'sm_mrp_gantt': 'cascade'},
    )

    def _get_view_info(self):
        return {'sm_mrp_gantt': {'icon': 'fa fa-industry', 'multi_record': True}} | super()._get_view_info()

    def _is_qweb_based_view(self, view_type):
        return view_type == 'sm_mrp_gantt' or super()._is_qweb_based_view(view_type)

    def _get_view_fields(self, view_type, models):
        if view_type == 'sm_mrp_gantt':
            models[self._name] = list(self._fields.keys())
            return models
        return super()._get_view_fields(view_type, models)

    def _validate_tag_sm_mrp_gantt(self, node, name_manager, node_info):
        if not node_info['validate']:
            return

        for child in node.iterchildren(tag=etree.Element):
            if child.tag != 'field':
                self._raise_view_error(_('SM MRP Gantt child can only be field, got %s', child.tag), child)

        remaining = set(node.attrib) - SM_MRP_GANTT_VALID_ATTRIBUTES
        if remaining:
            self._raise_view_error(
                _(
                    'Invalid attributes (%(invalid_attributes)s) in sm_mrp_gantt view. Attributes must be in (%(valid_attributes)s)',
                    invalid_attributes=remaining,
                    valid_attributes=SM_MRP_GANTT_VALID_ATTRIBUTES,
                ),
                node,
            )
