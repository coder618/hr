<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Payslip - {{ $payslip->payslip_number }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333333;
            line-height: 1.4;
            font-size: 12px;
            margin: 20px;
        }
        .header {
            border-bottom: 2px solid #4F46E5;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #1E293B;
        }
        .payslip-title {
            font-size: 14px;
            font-weight: bold;
            color: #4F46E5;
            text-transform: uppercase;
            margin-top: 5px;
        }
        .meta-table, .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .meta-table td {
            padding: 5px 8px;
            font-size: 11px;
        }
        .meta-label {
            font-weight: bold;
            color: #64748B;
            width: 25%;
        }
        .breakdown-table th {
            background-color: #F8FAFC;
            color: #475569;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 8px;
            border-bottom: 1px solid #E2E8F0;
        }
        .breakdown-table td {
            padding: 7px 8px;
            border-bottom: 1px solid #F1F5F9;
        }
        .text-right {
            text-align: right;
        }
        .total-row {
            font-weight: bold;
            background-color: #F8FAFC;
        }
        .net-pay-box {
            background-color: #EEF2FF;
            border: 1px solid #C7D2FE;
            border-radius: 6px;
            padding: 12px 16px;
            margin-top: 15px;
        }
        .net-pay-amount {
            font-size: 18px;
            font-weight: bold;
            color: #4338CA;
        }
        .footer {
            margin-top: 40px;
            font-size: 10px;
            color: #94A3B8;
            text-align: center;
            border-top: 1px solid #E2E8F0;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <table style="width: 100%;">
            <tr>
                <td>
                    <div class="company-name">{{ $organization->name ?? 'Company' }}</div>
                    <div class="payslip-title">Official Payslip</div>
                </td>
                <td class="text-right">
                    <div><strong>Payslip #:</strong> {{ $payslip->payslip_number }}</div>
                    <div><strong>Period:</strong> {{ date('F Y', mktime(0, 0, 0, $payslip->month, 1, $payslip->year)) }}</div>
                    <div><strong>Status:</strong> {{ strtoupper($payslip->payment_status) }}</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Employee & Attendance Info -->
    <table class="meta-table">
        <tr>
            <td class="meta-label">Employee Name:</td>
            <td>{{ $employee->first_name }} {{ $employee->last_name }}</td>
            <td class="meta-label">Employee Code:</td>
            <td>{{ $employee->employee_code }}</td>
        </tr>
        <tr>
            <td class="meta-label">Department:</td>
            <td>{{ $employee->department?->name ?? 'N/A' }}</td>
            <td class="meta-label">Designation:</td>
            <td>{{ $employee->designation?->name ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Payment Method:</td>
            <td style="text-transform: capitalize;">{{ str_replace('_', ' ', $payslip->payment_method) }}</td>
            <td class="meta-label">Work Days / Present:</td>
            <td>{{ $payslip->working_days }} / {{ $payslip->present_days }} days</td>
        </tr>
    </table>

    <!-- Earnings & Deductions Tables -->
    <table style="width: 100%;">
        <tr style="vertical-align: top;">
            <!-- Earnings (Left) -->
            <td style="width: 50%; padding-right: 10px;">
                <table class="breakdown-table">
                    <thead>
                        <tr>
                            <th>Earnings</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($payslip->earnings_breakdown as $item)
                        <tr>
                            <td>{{ $item['name'] }}</td>
                            <td class="text-right">{{ number_format($item['amount'], 2) }}</td>
                        </tr>
                        @endforeach
                        <tr class="total-row">
                            <td>Gross Earnings</td>
                            <td class="text-right">{{ number_format($payslip->gross_pay, 2) }}</td>
                        </tr>
                    </tbody>
                </table>
            </td>

            <!-- Deductions (Right) -->
            <td style="width: 50%; padding-left: 10px;">
                <table class="breakdown-table">
                    <thead>
                        <tr>
                            <th>Deductions</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($payslip->deductions_breakdown as $item)
                        <tr>
                            <td>{{ $item['name'] }}</td>
                            <td class="text-right">{{ number_format($item['amount'], 2) }}</td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="2" style="color: #94A3B8; text-align: center;">No deductions recorded</td>
                        </tr>
                        @endforelse
                        <tr class="total-row">
                            <td>Total Deductions</td>
                            <td class="text-right">{{ number_format($payslip->total_deductions, 2) }}</td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    </table>

    <!-- Net Pay Box -->
    <div class="net-pay-box">
        <table style="width: 100%;">
            <tr>
                <td>
                    <div style="font-size: 11px; color: #4F46E5; font-weight: bold; text-transform: uppercase;">Net Payable Salary</div>
                    <div style="font-size: 10px; color: #64748B;">Gross Earnings minus Total Deductions</div>
                </td>
                <td class="text-right">
                    <div class="net-pay-amount">{{ number_format($payslip->net_pay, 2) }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="footer">
        This is a system-generated document and requires no physical signature. Generated on {{ date('d-m-Y H:i') }}.
    </div>
</body>
</html>
