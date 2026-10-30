// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/table.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../vendor/8bitcn/components/ui/8bit/table';

export default function Demo() {
  return (
    <>
      <Table className="w-60 md:w-auto">
        <TableCaption className="text-xs md:text-sm">A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Method</TableHead>
            <TableHead className="text-right hidden md:table-cell">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">INV001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell className="hidden md:table-cell">Credit Card</TableCell>
            <TableCell className="text-right hidden md:table-cell">$250.00</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">INV002</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell className="hidden md:table-cell">Cash</TableCell>
            <TableCell className="text-right hidden md:table-cell">$300.00</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">INV003</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell className="hidden md:table-cell">Credit Card</TableCell>
            <TableCell className="text-right hidden md:table-cell">$250.00</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
}
