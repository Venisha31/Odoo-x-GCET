export const downloadCSV = (data, filename) => {
    if (!data || !data.length) return;

    const separator = ',';
    const keys = Object.keys(data[0]);

    // Header
    const header = keys.join(separator);

    // Rows
    const rows = data.map(row => {
        return keys.map(key => {
            let cell = row[key];

            // Handle null/undefined
            if (cell === null || cell === undefined) cell = '';

            // Handle strings with commas or quotes
            if (typeof cell === 'string') {
                if (cell.includes(separator) || cell.includes('"') || cell.includes('\n')) {
                    cell = `"${cell.replace(/"/g, '""')}"`;
                }
            }

            // Format dates
            if (cell instanceof Date) {
                cell = cell.toISOString().split('T')[0];
            }

            return cell;
        }).join(separator);
    }).join('\n');

    const csvContent = `${header}\n${rows}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
