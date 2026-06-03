/** Reporting endpoints + export (PDF/CSV). */
const { ApiError, asyncHandler, validateQuery } = require('@fems/shared');
const reports = require('./reportService');
const storage = require('./reportStorage');
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
/**
 * Export a report and store it in the database for audit trail.
 * Generates the report on-demand and saves it for later retrieval.
 */
const exportReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const format = (req.query.format || 'pdf').toLowerCase();
  const data = await buildExport(type);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${type}_report_${stamp}`;

  let fileContent;
  let contentType;

  if (format === 'csv') {
    fileContent = toCsv(data.csvRows);
    contentType = 'text/csv';
  } else if (format === 'pdf') {
    fileContent = await toPdf({ title: data.title, subtitle: data.subtitle, sections: data.sections });
    contentType = 'application/pdf';
  } else {
    throw ApiError.badRequest("format must be 'pdf' or 'csv'");
  }

  // Store report in database for audit/retrieval
  const stored = await storage.storeReport(
    req.user.id,
    type,
    format,
    `${data.title} - ${stamp}`,
    fileContent,
    30 // Expire after 30 days
  );

  // Send file to client
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.${format}"`);
  res.setHeader('X-Report-ID', stored.id); // Allow client to reference stored report
  res.send(fileContent);
});

// ============================================================================
// Stored Reports — retrieve previously generated reports
// ============================================================================

/**
 * GET /reports/stored — list all stored reports for the user.
 * Supports filtering by report type and pagination.
 */
const listStoredReports = asyncHandler(async (req, res) => {
  const q = require('@fems/shared').validateQuery(req.query, {
    type: { maxLen: 50 },
    limit: { type: 'int', min: 1, max: 100 },
    offset: { type: 'int', min: 0 },
  });

  const result = await storage.listReports(req.user.id, {
    type: q.type || undefined,
    limit: q.limit || 20,
    offset: q.offset || 0,
  });

  res.json(result);
});

/**
 * GET /reports/stored/:id — retrieve a specific stored report file.
 * Returns the original PDF or CSV file.
 */
const getStoredReport = asyncHandler(async (req, res) => {
  const report = await storage.getReport(req.params.id, req.user.id);

  // Return file with appropriate headers
  const ext = report.format === 'csv' ? 'csv' : 'pdf';
  const contentType = report.format === 'csv' ? 'text/csv' : 'application/pdf';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${report.title}.${ext}"`);
  res.setHeader('Content-Length', report.file_size_bytes);

  res.send(report.data);
});

/**
 * DELETE /reports/stored/:id — delete a stored report.
 * Only the user who created the report can delete it.
 */
const deleteStoredReport = asyncHandler(async (req, res) => {
  await storage.deleteReport(req.params.id, req.user.id);
  res.status(204).send();
});

module.exports = {
  getInventory, getInspections, getCompliance, getMaintenance, getSummary, exportReport,
  listStoredReports, getStoredReport, deleteStoredReport,
};
