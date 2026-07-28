export type DomainStatus = 'pending_dns' | 'active' | 'error';

export interface DnsInstruction {
	type: 'CNAME' | 'TXT' | 'NS';
	name: string;
	value: string;
	purpose: 'traffic' | 'ownership';
}

export interface CustomDomain {
	hostname: string;
	routingMode?: 'subdomains';
	status: DomainStatus;
	dnsInstructions: DnsInstruction[];
	error?: string;
	createdAt: string;
	updatedAt: string;
	verifiedAt?: string;
}
