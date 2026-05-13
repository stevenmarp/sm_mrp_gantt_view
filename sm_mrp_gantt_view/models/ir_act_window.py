# -*- coding: utf-8 -*-

from odoo import fields, models


class IrActWindowView(models.Model):
    _inherit = 'ir.actions.act_window.view'

    view_mode = fields.Selection(
        selection_add=[('sm_mrp_gantt', 'SM MRP Gantt')],
        ondelete={'sm_mrp_gantt': 'cascade'},
    )
