update public.purchases
set
    actual_cost = round((total_cost - coalesce(discount, 0))::numeric, 2),
    cash_used = round(
        greatest(0, least(coalesce(cash_used, 0), total_cost - coalesce(discount, 0)))::numeric,
        2
    ),
    payment_source = (
        case
            when round(
                greatest(0, least(coalesce(cash_used, 0), total_cost - coalesce(discount, 0)))::numeric,
                2
            ) = 0 then 'external'
            when round(
                greatest(0, least(coalesce(cash_used, 0), total_cost - coalesce(discount, 0)))::numeric,
                2
            ) >= round((total_cost - coalesce(discount, 0))::numeric, 2) then 'revenue'
            else 'mixed'
        end
    )::payment_source_enum
where
    round(coalesce(actual_cost, 0)::numeric, 2) <> round((total_cost - coalesce(discount, 0))::numeric, 2)
    or round(coalesce(cash_used, 0)::numeric, 2) <> round(
        greatest(0, least(coalesce(cash_used, 0), total_cost - coalesce(discount, 0)))::numeric,
        2
    )
    or coalesce(payment_source::text, '') <> case
        when round(
            greatest(0, least(coalesce(cash_used, 0), total_cost - coalesce(discount, 0)))::numeric,
            2
        ) = 0 then 'external'
        when round(
            greatest(0, least(coalesce(cash_used, 0), total_cost - coalesce(discount, 0)))::numeric,
            2
        ) >= round((total_cost - coalesce(discount, 0))::numeric, 2) then 'revenue'
        else 'mixed'
    end;
