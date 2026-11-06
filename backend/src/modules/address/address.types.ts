export interface AddressDTO {
  label: string;
  phone: string;
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface AddressResponse extends AddressDTO {
  id: number;
  user_id: number;
}

export interface UpdateAddressDTO {
  label?: string;
  phone?: string;
  street_address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}
