import { In, Repository } from 'typeorm'

import { EmailCode } from '../../src/auth/email-code.entity'
import { User } from '../../src/users/user.entity'

export async function cleanupE2EUsers(params: {
	emails: string[]
	emailCodesRepo: Repository<EmailCode>
	usersRepo: Repository<User>
}) {
	const { emails, emailCodesRepo, usersRepo } = params

	if (emails.length === 0) return

	await emailCodesRepo.delete({
		email: In(emails),
	})

	await usersRepo.delete({
		email: In(emails),
	})
}
