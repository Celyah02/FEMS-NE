/** Reporting endpoints + export (PDF/CSV). */
const { ApiError, asyncHandler, validateQuery } = require('@fems/shared');
const reports = require('./reportService');
const { toCsv, toPdf } = require('./exporters');

const getInventory = asyncHandler(async (_req, res) => res.json(await reports.inventoryReport()));
const getInspections = asyncHandler(async (_req, res) => res.json(await reports.inspectionReport()));
const getCompliance = asyncHandler(async (req, res) => {
  const q = validateQuery(req.query, {
    upcomingDays: { type: 'int', custom: (n) => n >= 1 && n <= 3650, message: 'must be between 1 and 3650' },
  });
  res.json(await reports.complianceReport(q.upcomingDays || 30));
});
const getMaintenance = asyncHandler(async (_req, res) => res.json(await reports.maintenanceReport()));
const getSummary = asyncHandler(async (_req, res) => res.json(await reports.dashboardSummary()));

/**
 * Flatten each report into (csvRows, pdfSections) for export.
 */
async function buildExport(type) {
  switch (type) {
    case 'inventory': {
      const r = await reports.inventoryReport();
      const csvRows = [
        ...r.byStatus.map((x) => ({ dimension: 'status', key: x.status, count: x.count })),
        ...r.byType.map((x) => ({ dimension: 'type', key: x.type, count: x.count })),
        ...r.bySize.map((x) => ({ dimension: 'size', key: x.size, count: x.count })),
      ];
      return {
        title: 'Inventory Report',
        subtitle: `Total extinguishers: ${r.total}`,
        csvRows,
        sections: [
          { heading: 'By Status', rows: r.byStatus },
          { heading: 'By Type', rows: r.byType },
          { heading: 'By Size', rows: r.bySize },
          { heading: 'Monthly Summary', rows: r.summaries.monthly },
        ],
      };
    }
    case 'inspections': {
      const r = await reports.inspectionReport();
      return {
        title: 'Inspection Report',
        subtitle: `Pending: ${r.counts.pending}  Completed: ${r.counts.completed}  Overdue: ${r.counts.overdue}`,
        csvRows: r.inspections,
        sections: [{ heading: 'Inspections', rows: r.inspections }],
      };
    }
    case 'compliance': {
      const r = await reports.complianceReport();
      return {
        title: 'Compliance Report',
        subtitle: `Compliance: ${r.compliancePercentage}%  Expired: ${r.expiredCount}  Upcoming: ${r.upcomingCount}`,
        csvRows: [...r.expired.map((e) => ({ ...e, bucket: 'expired' })),
                  ...r.upcomingExpirations.map((e) => ({ ...e, bucket: 'upcoming' }))],
        sections: [
          { heading: 'Expired Extinguishers', rows: r.expired },
          { heading: 'Upcoming Expirations', rows: r.upcomingExpirations },
        ],
      };
    }
    case 'maintenance': {
      const r = await reports.maintenanceReport();
      return {
        title: 'Maintenance Report',
        subtitle: `Total records: ${r.totalRecords}`,
        csvRows: r.history,
        sections: [
          { heading: 'Maintenance Frequency', rows: r.frequency },
          { heading: 'Maintenance History', rows: r.history },
        ],
      };
    }
    default:
      throw ApiError.badRequest(`Unknown report type: ${type}`);
  }
}

// GET /reports/:type/export?format=pdf|csv
const exportReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const format = (req.query.format || 'pdf').toLowerCase();
  const data = await buildExport(type);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${stamp}.csv"`);
    return res.send(toCsv(data.csvRows));
  }
  if (format === 'pdf') {
    const buffer = await toPdf({ title: data.title, subtitle: data.subtitle, sections: data.sections });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${stamp}.pdf"`);
    return res.send(buffer);
  }
  throw ApiError.badRequest("format must be 'pdf' or 'csv'");
});

module.exports = {
  getInventory, getInspections, getCompliance, getMaintenance, getSummary, exportReport,
};
